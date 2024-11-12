import * as duckdb from "@duckdb/duckdb-wasm";
import {AsyncDuckDBConnection, DuckDBDataProtocol} from "@duckdb/duckdb-wasm";
import {DataConnection, DataConnectionState, DataSource, DBConnectionType} from "@/state/connections.state";
import {getRelationId, Relation} from "@/model/relation";
import {loadDuckDBDataSources} from "@/state/connections/duckdb-helper";
import Error from "next/error";
import {FormDefinition} from "@/components/basics/input/custom-form";

export const DUCKDB_WASM_ID = 'duckdb-wasm';
export const DUCKDB_WASM_BASE_DATABASE = 'memory';
export const DUCKDB_WASM_BASE_SCHEMA = 'main';

export function getDuckDBWasmConnection(): DataConnection {
    return new DuckDBWasm(DUCKDB_WASM_ID, {name: 'DuckDB WASM'});
}

export interface DuckDBWasmConfig {
    name: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

export class DuckDBWasm implements DataConnection {

    id: string;
    type: DBConnectionType;

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

    async initialise(): Promise<DataConnectionState> {
        const {db, connection} = await staticDuckDBBundles();
        this.db = db;
        this.connection = connection;
        return 'connected';
    }

    async executeQuery(query: string): Promise<Relation> {
        const localConnection = await this.db?.connect();

        const arrowResult = await localConnection!.query(query);

        // close connection
        await localConnection!.close();
        console.log("Arrow result", arrowResult);
        return relationFromDuckDBResult('result', this.id, arrowResult);
    }

    async loadDataSources(): Promise<DataSource[]> {
        return loadDuckDBDataSources((query: string) => this.executeQuery(query));
    }

    async getConnectionState(): Promise<DataConnectionState> {
        if (this.db && this.connection) {
            // test connection by running a simple query
            try {
                await this.connection.query("SELECT 1;");
                return 'connected';
            } catch (e) {
                return 'disconnected';
            }
        } else {
            return 'disconnected';
        }
    }

    // Create a table from a file that is loaded from the browser, returns the table name
    async createTableFromBrowserFileHandler(file: File): Promise<string> {

        if (!this.db || !this.connection) {
            // @ts-ignore
            throw new Error("DuckDB WASM not initialised");
        }

        const fileName = file.name;
        const tableName = fileName

        // check if table already exists, if so return the table name
        const findTableQuery = `SELECT *
                                FROM information_schema.tables
                                WHERE table_name = '${tableName}';`;
        const result = await this.executeQuery(findTableQuery);
        if (result.rows.length > 0) {
            return tableName;
        }

        await this.db.registerFileHandle(fileName, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
        const tableNameEscaped = `"${tableName}"`;
        const createTableQuery = `
            CREATE TABLE ${tableNameEscaped} AS
            SELECT *
            FROM read_csv('${fileName}', AUTO_DETECT = TRUE);
        `;

        await this.connection.query(createTableQuery);
        return tableName;
    }
}


const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: 'duckdb-mvp.wasm',
        mainWorker: 'duckdb/duckdb-browser-mvp.worker.js',
    },
    eh: {
        mainModule: 'duckdb-eh.wasm',
        mainWorker: 'duckdb/duckdb-browser-eh.worker.js',
    },
};


async function staticDuckDBBundles(): Promise<{
    db: duckdb.AsyncDuckDB,
    connection: AsyncDuckDBConnection
}> {

    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    const connection = await db.connect();

    return {db, connection};
}


export function relationFromDuckDBResult(relationName: string, connectionId: string, arrowResult: any): Relation {


    // Convert arrow table to json
    const json = arrowResult.toArray().map((row: any) => row.toJSON());
    console.log("Arrow result JSON", json);

    // if the json is empty, return an empty relation
    if (json.length === 0) {
        return {
            id: getRelationId(connectionId, DUCKDB_WASM_BASE_DATABASE, DUCKDB_WASM_BASE_SCHEMA, relationName),
            connectionId: connectionId,
            database: DUCKDB_WASM_BASE_DATABASE,
            schema: DUCKDB_WASM_BASE_SCHEMA,
            name: relationName,
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
        id: getRelationId(connectionId, DUCKDB_WASM_BASE_DATABASE, DUCKDB_WASM_BASE_SCHEMA, relationName),
        connectionId: connectionId,
        database: DUCKDB_WASM_BASE_DATABASE,
        schema: DUCKDB_WASM_BASE_SCHEMA,
        name: relationName,
        columns: columns.map((column) => {
            return {
                name: column,
                type: 'String'
            }
        }),
        rows
    };
}
