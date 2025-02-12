import * as duckdb from "@duckdb/duckdb-wasm";
import {AsyncDuckDBConnection} from "@duckdb/duckdb-wasm";
import {RelationData} from "@/model/relation";
import {loadDuckDBDataSources} from "@/state/connections-source/duckdb-helper";
import {DATABASE_CONNECTION_ID_DUCKDB_WASM} from "@/platform/global-data";
import {DataSource} from "@/model/data-source-connection";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections-database/configs";


export function getDuckDBWasmConnection(): DatabaseConnection {
    return new DuckDBWasm(DATABASE_CONNECTION_ID_DUCKDB_WASM, {name: 'DuckDB WASM'});
}

export interface DuckDBWasmConfig {
    name: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

export class DuckDBWasm implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};

    dataSources: DataSource[];

    db?: duckdb.AsyncDuckDB;
    connection?: AsyncDuckDBConnection;

    config: DuckDBWasmConfig;

    constructor(id: string, config: DuckDBWasmConfig) {
        this.id = id;

        this.type = 'duckdb-wasm';
        this.dataSources = [];
        this.config = config;
    }

    async initialise(): Promise<ConnectionStatus> {
        const {db, connection} = await staticDuckDBBundles();
        this.db = db;
        this.connection = connection;
        return this.checkConnectionState();
    }

    async executeQuery(query: string): Promise<RelationData> {
        const localConnection = await this.db?.connect();

        const arrowResult = await localConnection!.query(query);

        // close connection
        await localConnection!.close();
        return relationFromDuckDBArrowResult('result', this.id, arrowResult);
    }

    async loadDataSources(): Promise<DataSource[]> {
        return loadDuckDBDataSources((query: string) => this.executeQuery(query));
    }

    async checkConnectionState(): Promise<ConnectionStatus> {
        if (this.db && this.connection) {
            // test connection by running a simple query
            try {
                await this.connection.query("SELECT 1;");
                this.connectionStatus = {state: 'connected'};
            } catch (e: any) {
                this.connectionStatus = {state: 'error', message: e.message};
            }
        } else {
            this.connectionStatus = {state: 'disconnected', message: 'DuckDB WASM not initialised'};
        }
        return this.connectionStatus;
    }

    updateConfig(config: Partial<DuckDBWasmConfig>): void {
        this.config = {...this.config, ...config};
    }
}

async function staticDuckDBBundles(): Promise<{
    db: duckdb.AsyncDuckDB,
    connection: AsyncDuckDBConnection
}> {

    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker!}");`], {type: 'text/javascript'})
    );

    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);

    const connection = await db.connect();

    return {db, connection};
}


export function relationFromDuckDBArrowResult(relationName: string, connectionId: string, arrowResult: any): RelationData {

    // Convert arrow table to json
    const json = arrowResult.toArray().map((row: any) => row.toJSON());

    // if the json is empty, return an empty relation
    if (json.length === 0) {
        return {
            columns: [],
            rows: []
        };
    }
    const firstRow = json[0];
    const columns = Object.keys(firstRow);

    const rows = json.map((jsonRow: any) => {
        // the row is the list of values of the json map
        return columns.map((column) => jsonRow[column]);
    });

    return {
        columns: columns.map((column) => {
            return {
                id: column,
                name: column,
                // todo: infer type from data
                type: 'String'
            }
        }),
        rows
    };
}
