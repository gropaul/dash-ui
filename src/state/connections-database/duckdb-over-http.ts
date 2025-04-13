import {RelationData} from "@/model/relation";
import {duckDBTypeToValueType} from "@/model/value-type";
import {QueryResponse} from "@/model/query-response";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections-database/configs";
import {toast} from "sonner";

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

    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};

    constructor(config: DuckDBOverHttpConfig, id: string) {
        this.id = id;
        this.config = config;
        this.type = 'duckdb-over-http';
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

    importFilesFromBrowser = async (files: File[]): Promise<void> => {
        toast.error('Importing file via Drag and Drop is not yet supported. Please use the CLI to import files.');
    };

    async checkConnectionState(): Promise<ConnectionStatus> {
        const version = await this.sendPing();
        if (version) {
            this.connectionStatus = {state: 'connected', version: version, message: `Connected to ${this.config.url}, version: ${version}`};
        } else {
            this.connectionStatus = {state: 'error', message: `Failed to ping ${this.config.url}`, version: undefined};
        }
        return this.connectionStatus;
    }

    initialise(): Promise<ConnectionStatus> {
        // no initialisation needed
        return this.checkConnectionState();
    }

    async updateConfig(config: Partial<DuckDBOverHttpConfig>): Promise<void> {
        this.config = {...this.config, ...config};
    }
}

