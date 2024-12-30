import * as duckdb from "@duckdb/duckdb-wasm";
import {AsyncDuckDBConnection, DuckDBDataProtocol} from "@duckdb/duckdb-wasm";
import {RelationData} from "@/model/relation";
import {
    creatTableIfNotExistsFromFilePath,
    loadDuckDBDataSources,
    onDuckDBDataSourceClick
} from "@/state/connections/duckdb-helper";
import Error from "next/error";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {CONNECTION_ID_DUCKDB_WASM} from "@/platform/global-data";
import {ConnectionStatus, DataConnection, DataSource, DBConnectionType} from "@/model/connection";


export function getDuckDBWasmConnection(): DataConnection {
    return new DuckDBWasm(CONNECTION_ID_DUCKDB_WASM, {name: 'DuckDB WASM'});
}

export interface DuckDBWasmConfig {
    name: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

export class DuckDBWasm implements DataConnection {

    id: string;
    type: DBConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};

    dataSources: DataSource[];

    db?: duckdb.AsyncDuckDB;
    connection?: AsyncDuckDBConnection;

    config: DuckDBWasmConfig;
    configForm: FormDefinition = {
        fields: [
            {
                type: 'text',
                label: 'Name',
                key: 'name',
                required: true
            }
        ]
    }

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

    // Create a table from a file that is loaded from the browser, returns the table name
    async createTableFromBrowserFileHandler(file: File): Promise<string> {

        if (!this.db || !this.connection) {
            // @ts-ignore
            throw new Error("DuckDB WASM not initialised");
        }

        const fileName = file.name;
        const tableName = fileName

        await this.db.registerFileHandle(fileName, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
        await creatTableIfNotExistsFromFilePath(this, fileName, tableName);
        return tableName;
    }

    async onDataSourceClick(id_path: string[]) {
        await onDuckDBDataSourceClick(this, id_path, this.dataSources);
    }

    loadChildrenForDataSource(_id_path: string[]): Promise<DataSource[]> {
        console.error('Not implemented');
        return Promise.resolve([]);
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
