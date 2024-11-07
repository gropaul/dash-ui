import * as duckdb from "@duckdb/duckdb-wasm";
import {AsyncDuckDBConnection, DuckDBDataProtocol} from "@duckdb/duckdb-wasm";
import {
    DataConnection,
    DataConnectionState,
    DataSource, DataSourceElement,
    DataSourceGroup,
    DBConnectionType
} from "@/state/connections.state";
import {getRelationId, getRows, iterateColumns, Relation} from "@/model/relation";
import {duckDBTypeToValueType} from "@/model/value-type";
import {parseListString} from "@/state/connections/duckdb-over-http";
import {loadDuckDBDataSources} from "@/state/connections/duckdb-helper";

export const DUCKDB_WASM_ID = 'duckdb-wasm';

export function getDuckDBWasmConnection(): DataConnection {
    return new DuckDBWasm(DUCKDB_WASM_ID, 'DuckDB WASM');
}

export class DuckDBWasm implements DataConnection {
    id: string;
    name: string;
    type: DBConnectionType;
    dataSources: DataSource[];

    db?: duckdb.AsyncDuckDB;
    connection?: AsyncDuckDBConnection;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.type = 'duckdb-wasm';
        this.dataSources = [];
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
            throw new Error("DuckDB connection not initialised");
        }

        const fileName = file.name;
        const tableName = fileName

        // check if table already exists, if so return the table name
        const findTableQuery = `SELECT * FROM information_schema.tables WHERE table_name = '${tableName}';`;
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

    // const path = "http://localhost:3333/web-edge.csv";
    // test whether we can load the csv due to CORS
    // const test = await fetch(path);
    // console.log("CSV fetch result", test);

    // // time the query execution
    // const start = Date.now();
    // // run test query
    // const query = "SELECT COUNT(*) FROM read_csv('http://localhost:3333/web-edge.csv', AUTO_DETECT=TRUE);";
    // const result = await connection.query(query);

    // const duration = Date.now() - start;
    // console.log("Query duration", duration);
    // console.log("Query result", result);

    return {db, connection};
}


export function relationFromDuckDBResult(relationName: string, connectionId: string, arrowResult: any): Relation {


    // Convert arrow table to json
    const json = arrowResult.toArray().map((row: any) => row.toJSON());
    console.log("Arrow result JSON", json);

    // if the json is empty, return an empty relation
    if (json.length === 0) {
        return {
            id: getRelationId(relationName, undefined, connectionId),
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
        id: getRelationId(relationName, undefined, connectionId),
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
