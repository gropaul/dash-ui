import {RelationData} from "@/model/relation";
import {duckDBTypeToValueType} from "@/model/value-type";
import {QueryResponse} from "@/model/query-response";
import {
    ConnectionStatus,
    DatabaseConnection,
    DefaultStateStorageInfo,
    StateStorageInfo
} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections/configs";
import {toast} from "sonner";
import {GetStateStorageStatus} from "@/state/persistency/duckdb-storage";
import {DEFAULT_STATE_STORAGE_DESTINATION, ERROR_MESSAGE_QUERY_ABORTED} from "@/platform/global-data";
import {AsyncQueue} from "@/platform/async-queue";
import {enqueueStatements} from "@/state/connections/utils";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";

export interface DuckDBOverHttpConfig {
    name: string;
    url: string;
    useToken: boolean;

    // if authentication is token, these fields are required
    token?: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

export class DuckDBOverHttp implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    config: DuckDBOverHttpConfig;
    storageInfo: StateStorageInfo = DefaultStateStorageInfo()


    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};
    queue: AsyncQueue<string, RelationData>;

    constructor(config: DuckDBOverHttpConfig, id: string) {
        this.id = id;
        this.config = config;
        this.type = 'duckdb-over-http';

        this.queue = new AsyncQueue<string, RelationData>((input) => this.executeQueryInternal(input));
    }

    async abortQuery(): Promise<void> {
        await this.queue.cancelAll(Error(ERROR_MESSAGE_QUERY_ABORTED));
        await this.sendCancel();

    }

    async sendCancel(): Promise<void> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (this.config.useToken) {
            headers['X-API-Key'] = this.config.token!;
        }
        const response = await fetch(this.config.url + "/cancel", {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        console.log("Cancel request sent to server");

    }

    canHandleMultiTab(): boolean {
        return true;
    }

    destroy(): Promise<void> {
        // no need to destroy anything
        return Promise.resolve();
    }

    async sendPing(): Promise<string | null> {
        try {
            const versionResult = await this.executeQuery("select version();");
            return versionResult.rows[0][0] as string;
        } catch (e) {
            return null;
        }
    }

    async executeQueryInternal(query: string): Promise<RelationData> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.config.useToken) {
            headers['X-API-Key'] = this.config.token!;
        }

        try {
            const response = await fetch(this.config.url + "/query", {
                method: 'POST',
                body: JSON.stringify({
                    query: query,
                    format: "compact_json"
                }),
                headers,
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const json: QueryResponse = await response.json();
            return {
                columns: json.columns.map((column: any) => ({
                    name: column.name,
                    type: duckDBTypeToValueType(column.type),
                    id: column.name,
                })),
                rows: json.rows
            };
        } catch (error) {
            if (error instanceof Error && error.message.includes('INTERRUPT')){
                throw new Error(ERROR_MESSAGE_QUERY_ABORTED);
            }
            throw error;
        }
    }


    executeQuery = (sql: string): Promise<RelationData> => {
        return enqueueStatements(sql, this.queue);
    };

    mountFiles = async (files: File[]): Promise<void> => {
        toast.error('Importing file via Drag and Drop is not yet supported. Please use the CLI to import files.');
    };

    async checkConnectionState(): Promise<ConnectionStatus> {
        const version = await this.sendPing();
        if (version) {
            this.connectionStatus = {state: 'connected', version: version, message: `Connected to ${this.config.url}, version: ${version}`};
            this.storageInfo = await GetStateStorageStatus(DEFAULT_STATE_STORAGE_DESTINATION, this.executeQuery.bind(this));
        } else {
            this.connectionStatus = {state: 'error', message: `Failed to ping ${this.config.url}`, version: undefined};
        }
        return this.connectionStatus;
    }

    initialise(): Promise<ConnectionStatus> {
        // initialise the connection by checking the connection state
        return this.checkConnectionState();
    }

    async updateConfig(config: Partial<DuckDBOverHttpConfig>): Promise<void> {
        this.config = {...this.config, ...config};
    }
}

