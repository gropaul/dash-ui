import {RelationData} from "@/model/relation";
import {Column, DataSource} from "@/model/data-source-connection";
import {
    ConnectionStatus,
    DatabaseConnection,
    DefaultStateStorageInfo,
    StateStorageInfo
} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections/configs";
import {downloadOPFSFile, mountFilesOnWasm} from "@/state/connections/duckdb-wasm/utils";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {duckDBTypeToValueType} from "@/model/value-type";
import {GetStateStorageStatus} from "@/state/persistency/duckdb-storage";
import {DEFAULT_STATE_STORAGE_DESTINATION, ERROR_MESSAGE_QUERY_ABORTED} from "@/platform/global-data";
import {AsyncQueue} from "@/platform/async-queue";
import {enqueueStatements} from "@/state/connections/utils";
import {escapeSQLForStringLiteral} from "@/platform/sql-utils";

export interface DuckDBWasmConfig {
    name: string;

    [key: string]: string | number | boolean | undefined; // index signature
}


export class DuckDBWasm implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};
    storageInfo: StateStorageInfo = DefaultStateStorageInfo()

    dataSources: DataSource[];
    config: DuckDBWasmConfig;

    queue: AsyncQueue<string, RelationData>;

    constructor(config: DuckDBWasmConfig, id: string) {
        this.id = id;

        this.type = 'duckdb-wasm';
        this.dataSources = [];
        this.config = config;

        // to be able to use connection.send, we need to create a proper queue in order to avoid
        // sending multiple queries at the same time
        this.queue = new AsyncQueue<string, RelationData>((input) => this.executeQueryInternal(input));
    }


    canHandleMultiTab(): boolean {
        return false;
    }


    // close the duckdb connection on destroy
    async destroy(): Promise<void> {
        await DuckdbWasmProvider.getInstance().destroy();
    }

    async initialise(): Promise<ConnectionStatus> {
        return this.checkConnectionState();
    }

    async abortQuery(): Promise<void> {
        console.log("Aborting query");
        this.queue.cancelAll(ERROR_MESSAGE_QUERY_ABORTED);
        const {con} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
        await con.cancelSent()
    }

    async executeQuery(sql: string): Promise<RelationData> {
        return enqueueStatements(sql, this.queue);
    }

    polishColumn(column: Column) : Column {
        return {
            ...column,
            type: duckDBTypeToValueType(column.type),
            id: column.name
        }
    }

    async executeQueryInternal(query: string): Promise<RelationData> {
        try {
            // if no signal is provided, create a new one that times out after DEFAULT_QUERY_TIMEOUT
            const {db, con} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
            const query_escaped = escapeSQLForStringLiteral(query);
            // console.log(query_escaped);
            const materialize_json_query = `FROM query_result_json('${query_escaped}')`;
            const result = await con.send(materialize_json_query, false);
            const data = await result.readAll();

            // log the time taken to parse the result
            const startTime = performance.now();

            const json = data[0].toArray().map((row: any) => row.toJSON());
            const json_string = json[0]['data'];
            const data_parsed = JSON.parse(json_string) as RelationData;
            data_parsed.columns = data_parsed.columns.map(this.polishColumn)
            const endTime = performance.now();
            console.log(`Time taken to parse DuckDB WASM query result: ${endTime - startTime} ms`);
            return data_parsed;
        } catch (e: any) {
            // check if it is an error
            if (e instanceof Error) {
                if (e.message === '') {                // it is an abort error if there is an empty message
                    throw new Error(ERROR_MESSAGE_QUERY_ABORTED);
                }
            }
            throw e;
        }
    }


    async downloadDatabase(): Promise<void> {
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
            const versionResult = await this.executeQuery("select version();");
            const version = versionResult.rows[0][0] as string;
            console.log('DuckDB WASM version: ', version);
            this.storageInfo = await GetStateStorageStatus(DEFAULT_STATE_STORAGE_DESTINATION, this.executeQuery.bind(this));
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