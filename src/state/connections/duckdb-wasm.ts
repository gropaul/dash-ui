import * as duckdb from "@duckdb/duckdb-wasm";
import {AsyncDuckDBConnection, DuckDBDataProtocol} from "@duckdb/duckdb-wasm";
import {
    DataConnection, DataConnectionState,
    DataSource,
    DBConnectionType
} from "@/state/connections.state";
import {RelationData} from "@/model/relation";
import {loadDuckDBDataSources, onDuckDBDataSourceClick} from "@/state/connections/duckdb-helper";
import Error from "next/error";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {CONNECTION_ID_DUCKDB_WASM} from "@/platform/global-data";


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

    async executeQuery(query: string): Promise<RelationData> {
        const localConnection = await this.db?.connect();

        const arrowResult = await localConnection!.query(query);

        // close connection
        await localConnection!.close();
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

    async onDataSourceClick(id_path: string[]) {
        await onDuckDBDataSourceClick(this, id_path);
    }

    loadChildrenForDataSource(id_path: string[]): Promise<DataSource[]> {
        throw new Error("Method not implemented.");
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


export function relationFromDuckDBResult(relationName: string, connectionId: string, arrowResult: any): RelationData {

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
