import * as duckdb from "@duckdb/duckdb-wasm";
import {AsyncDuckDBConnection} from "@duckdb/duckdb-wasm";
import {RelationData} from "@/model/relation";
import {loadDuckDBDataSources} from "@/state/connections-source/duckdb-helper";
import {DataSource} from "@/model/data-source-connection";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections-database/configs";
import {importAndShowRelationsWithWASM} from "@/state/connections-database/duckdb-wasm/utils";

export interface DuckDBWasmConfig {
    name: string;
    persist_state: boolean;
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

    constructor(config: DuckDBWasmConfig, id: string) {
        this.id = id;

        this.type = 'duckdb-wasm';
        this.dataSources = [];
        this.config = config;
    }

    // close the duckdb connection on destroy
    async destroy(): Promise<void> {
        if (this.connection) {
            await this.connection.close();
        }
        if (this.db) {
            await this.db.terminate();
        }
    }

    async initialise(): Promise<ConnectionStatus> {
        const {db, connection} = await staticDuckDBBundles(this.config);
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

    async importFilesFromBrowser(files: File[]) : Promise<void> {
        await importAndShowRelationsWithWASM(files, this);
        // await updateDataSources(duckDBWasm.id); todo

    }

    async checkConnectionState(): Promise<ConnectionStatus> {
        if (this.db && this.connection) {
            // test connection by running a simple query
            try {
                const versionResult = await this.executeQuery("select version();");
                const version = versionResult.rows[0][0] as string;
                this.connectionStatus = {state: 'connected', message: `Connected to DuckDB WASM. Version: ${version}`};
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

async function staticDuckDBBundles(config: DuckDBWasmConfig): Promise<{
    db: duckdb.AsyncDuckDB,
    connection: AsyncDuckDBConnection
}> {

    const _JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(_JSDELIVR_BUNDLES);

    const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker!}");`], {type: 'text/javascript'})
    );

    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    await db.open({
        allowUnsignedExtensions: true, // needed for dash, todo this could be removed
    });
    URL.revokeObjectURL(worker_url);

    const connection = await db.connect();

    // const testResult = await connection.query("select 1 as test, range FROM range(1, 10);");
    // const testResultJson = testResult.toArray().map((row: any) => row.toJSON());
    // console.log("Test result:", testResult);
    // console.log("DuckDB WASM test result:", testResultJson);
    //
    //
    // const testResultRelation = relationFromDuckDBArrowResult('test', 'test', testResult);
    // console.log("DuckDB WASM test result relation:", testResultRelation);

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

    const types = arrowResult.schema.fields.map((field: any) => {
        return field.type.toString()
    })

    // if there is a bigint column, convert it to a number like Int64 and UInt64
    const bigintColumns = types.map((type: string) => {
        if (type === 'Int64' || type === 'UInt64') {
            return 'number';
        }
        return type;
    });

    // also cast the bigint values to number
    const rowsWithBigInt = rows.map((row: any) => {
        return row.map((value: any, index: number) => {
            if (bigintColumns[index] === 'number') {
                return Number(value);
            }
            return value;
        });
    });

    return {
        columns: columns.map((column, index) => {
            return {
                id: column,
                name: column,
                type: types[index],
            }
        }),
        rows: rowsWithBigInt,
    };
}
