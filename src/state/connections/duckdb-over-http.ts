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
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";

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

    constructor(config: DuckDBOverHttpConfig, id: string) {
        this.id = id;
        this.config = config;
        this.type = 'duckdb-over-http';
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
            const versionResult = await this.sendQuery("select version();");
            return versionResult.rows[0][0] as string;
        } catch (e) {
            return null;
        }
    }

    async sendQuery(query: string): Promise<RelationData> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.config.useToken) {
            headers['X-API-Key'] = this.config.token!;
        }

        const response = await fetch(this.config.url + "/query", {
            method: 'POST',
            body: JSON.stringify({
                query: query,
                format: "compact_json"
            }),
            headers
        })

        if (!response.ok) {
            throw new Error(await response.text())
        }

        const json: QueryResponse = await response.json();
        return {
            columns: json.meta.map((column: any) => ({
                name: column.name,
                type: duckDBTypeToValueType(column.type),
                id: column.name,
            })),
            rows: json.data
        };
    }


    executeQuery = (query: string): Promise<RelationData> => {
        return this.sendQuery(query);
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

