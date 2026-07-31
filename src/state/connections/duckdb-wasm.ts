import {GetEmptyRelationData, RelationData} from "@/model/relation";
import {Column, DataSource} from "@/model/data-source-connection";
import {
    ConnectionStatus,
    DatabaseConnection
} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections/configs";
import {downloadOPFSFile, mountFilesOnWasm} from "@/state/connections/duckdb-wasm/utils";
import {DuckdbWasmProvider, getStorageMode} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {duckDBTypeToValueType} from "@/model/value-type";
import {DEFAULT_STATE_STORAGE_DESTINATION, ERROR_MESSAGE_QUERY_ABORTED} from "@/platform/global-data";
import {AsyncQueue} from "@/platform/async-queue";
import {enqueueStatements} from "@/state/connections/utils";
import {escapeSQLForStringLiteral} from "@/platform/sql-utils";

export interface DuckDBWasmConfig {
    name: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

export interface QueryInput {
    query: string;
    readOnly: boolean;
    formatResultToJson: boolean;
}

export class DuckDBWasm implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};

    dataSources: DataSource[];
    config: DuckDBWasmConfig;

    queue: AsyncQueue<QueryInput, RelationData>;

    constructor(config: DuckDBWasmConfig, id: string) {
        this.id = id;

        this.type = 'duckdb-wasm';
        this.dataSources = [];
        this.config = config;

        // to be able to use connection.send, we need to create a proper queue in order to avoid
        // sending multiple queries at the same time
        this.queue = new AsyncQueue<QueryInput, RelationData>((input) => this.executeQueryInternal(input));
    }


    canHandleMultiTab(): boolean {
        return false;
    }

    async getStorageRoot(): Promise<string> {
        // OPFS files sit in the root; the project id is encoded in the file name.
        return 'opfs://';
    }


    // close the duckdb connection on destroy
    async destroy(): Promise<void> {
        await DuckdbWasmProvider.getInstance().destroy();
    }

    async initialise(): Promise<ConnectionStatus> {
        return this.checkConnectionState();
    }

    async abortQuery(): Promise<boolean> {
        console.log("Aborting query");
        this.queue.cancelAll(ERROR_MESSAGE_QUERY_ABORTED);
        console.log("Get current WASM instance and send cancel");
        const {db, con} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
        console.log("Current WASM instance and send cancel", con);
        const success = await con.cancelSent()
        console.log("Cancel sent to DuckDB WASM, success: ", success);
        return success;
    }

    async executeQuery(sql: string, readOnly: boolean, formatResultToJson: boolean = true): Promise<RelationData> {
        return enqueueStatements({query: sql, readOnly, formatResultToJson}, this.queue);
    }

    polishColumn(column: Column) : Column {
        return {
            ...column,
            type: duckDBTypeToValueType(column.type),
            id: column.name
        }
    }

    async executeQueryInternal(input: QueryInput): Promise<RelationData> {
        const {query, readOnly, formatResultToJson} = input;
        try {
            // if no signal is provided, create a new one that times out after DEFAULT_QUERY_TIMEOUT
            const {db, con} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
            let query_escaped = escapeSQLForStringLiteral(query);
            if (readOnly) {
                query_escaped = 'BEGIN TRANSACTION READ ONLY; ' + query_escaped + ';';
            }
            const materialize_json_query = `FROM query_result_json('${query_escaped}')`;
            const query_to_execute = formatResultToJson ? materialize_json_query : query;
            const result = await con.send(query_to_execute, true);
            const data = await result.readAll();

            if (formatResultToJson) {
                const json = data[0].toArray().map((row: any) => row.toJSON());
                let json_string;
                try {
                    json_string = json[0]['data'];
                } catch (e) {
                    console.error(e);
                    console.log("Error parsing JSON from query result: ", json);
                    throw new Error("Error parsing JSON from query result: " + e);
                }
                const data_parsed = JSON.parse(json_string) as RelationData;
                data_parsed.columns = data_parsed.columns.map(this.polishColumn);
                return data_parsed;
            } else {
                return GetEmptyRelationData();
            }
        } catch (e: any) {
            // check if it is an error
            if (e instanceof Error) {
                if (e.message === '') {                // it is an abort error if there is an empty message
                    throw new Error(ERROR_MESSAGE_QUERY_ABORTED);
                }
            }
            console.error("Error executing query: ", e);
            throw e;
        }
    }


    async downloadDatabase(): Promise<void> {
        if (getStorageMode() === 'memory') {
            throw new Error('Database export is not available in temporary (in-memory) mode.');
        }
        const opfs_path = DuckdbWasmProvider.getDatabasePath();
        // download the opfs database
        await downloadOPFSFile(opfs_path);
    }

    async mountFiles(files: File[]): Promise<void> {
        await mountFilesOnWasm(files, this);
        // await updateDataSources(duckDBWasm.id); todo

    }

    async checkConnectionState(): Promise<ConnectionStatus> {

        try {
            const versionResult = await this.executeQuery("select version();", false);
            const version = versionResult.rows[0][0] as string;
            console.log('Check connection status: DuckDB WASM version: ', version);
            // print the names of all the tables in the database using information_schema.tables, this is useful for debugging and to check if the database is accessible
            this.connectionStatus = {state: 'connected', message: `Connected to DuckDB WASM. Version: ${version}`};
        } catch (e: any) {
            const message = e.message;
            if (message.includes('createSyncAccessHandle')) {

                this.connectionStatus = {
                    state: 'error',
                    message: 'Failed to open the local database. This is likely because it is already in use by another browser tab.'
                };
                console.error('Failed to open the local database. Message: ', message);
            } else {
                this.connectionStatus = {state: 'error', message: e.message};
            }
        }

        return this.connectionStatus;
    }

    updateConfig(config: Partial<DuckDBWasmConfig>): void {
        this.config = {...this.config, ...config};
    }
}