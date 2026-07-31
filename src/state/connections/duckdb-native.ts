import {GetEmptyRelationData, RelationData} from "@/model/relation";
import {Column} from "@/model/data-source-connection";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections/configs";
import {duckDBTypeToValueType} from "@/model/value-type";
import {ERROR_MESSAGE_QUERY_ABORTED} from "@/platform/global-data";
import {AsyncQueue} from "@/platform/async-queue";
import {enqueueStatements} from "@/state/connections/utils";
import {escapeSQLForStringLiteral} from "@/platform/sql-utils";
import {QueryInput} from "@/state/connections/duckdb-wasm";
import {toast} from "sonner";

export interface DuckDBNativeConfig {
    name: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

// Native DuckDB in the Electron main process, reached via window.dashNative (electron/preload.cjs).
// The renderer half is deliberately a near-copy of DuckDBWasm: it produces the exact same escaped
// query, the main process wraps it in the shared `query_result_json` macro, and the resulting JSON
// string is parsed here identically. Native and WASM results are therefore byte-identical.
export class DuckDBNative implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};

    config: DuckDBNativeConfig;
    queue: AsyncQueue<QueryInput, RelationData>;

    constructor(config: DuckDBNativeConfig, id: string) {
        this.id = id;
        this.type = 'duckdb-native';
        this.config = config;
        this.queue = new AsyncQueue<QueryInput, RelationData>((input) => this.executeQueryInternal(input));
    }

    private native() {
        const api = typeof window !== 'undefined' ? window.dashNative : undefined;
        if (!api) {
            throw new Error('Native DuckDB is only available in the Dash desktop app.');
        }
        return api;
    }

    canHandleMultiTab(): boolean {
        // A single main-process connection owns the file; queries serialise through the AsyncQueue.
        return true;
    }

    async getStorageRoot(): Promise<string> {
        return this.native().storageRoot();
    }

    async destroy(): Promise<void> {
        // The main process owns the DuckDB instance lifecycle; nothing to tear down here.
    }

    async initialise(): Promise<ConnectionStatus> {
        return this.checkConnectionState();
    }

    async abortQuery(): Promise<boolean> {
        this.queue.cancelAll(ERROR_MESSAGE_QUERY_ABORTED);
        return this.native().interrupt();
    }

    async executeQuery(sql: string, readOnly: boolean, formatResultToJson: boolean = true): Promise<RelationData> {
        return enqueueStatements({query: sql, readOnly, formatResultToJson}, this.queue);
    }

    polishColumn(column: Column): Column {
        return {
            ...column,
            type: duckDBTypeToValueType(column.type),
            id: column.name
        };
    }

    async executeQueryInternal(input: QueryInput): Promise<RelationData> {
        const {query, readOnly, formatResultToJson} = input;
        try {
            if (!formatResultToJson) {
                // Side-effecting statement (e.g. CREATE): run raw, no macro, discard rows. Mirrors WASM.
                await this.native().queryRaw(query);
                return GetEmptyRelationData();
            }

            let query_escaped = escapeSQLForStringLiteral(query);
            if (readOnly) {
                query_escaped = 'BEGIN TRANSACTION READ ONLY; ' + query_escaped + ';';
            }
            // The main process wraps this in `FROM query_result_json('<escaped>')` and returns the JSON cell.
            const json_string = await this.native().query(query_escaped);
            const data_parsed = JSON.parse(json_string) as RelationData;
            data_parsed.columns = data_parsed.columns.map(this.polishColumn);
            return data_parsed;
        } catch (e: any) {
            if (e instanceof Error && e.message === '') {
                throw new Error(ERROR_MESSAGE_QUERY_ABORTED);
            }
            console.error("Error executing query: ", e);
            throw e;
        }
    }

    async mountFiles(_files: File[]): Promise<void> {
        // Not yet supported for native DuckDB (matches the http connection).
        toast.error('Importing files via drag and drop is not yet supported for native DuckDB.');
    }

    async checkConnectionState(): Promise<ConnectionStatus> {
        try {
            const versionResult = await this.executeQuery("select version();", false);
            const version = versionResult.rows[0][0] as string;
            this.connectionStatus = {state: 'connected', version, message: `Connected to native DuckDB. Version: ${version}`};
        } catch (e: any) {
            this.connectionStatus = {state: 'error', message: e.message};
        }
        return this.connectionStatus;
    }

    updateConfig(config: Partial<DuckDBNativeConfig>): void {
        this.config = {...this.config, ...config};
    }
}
