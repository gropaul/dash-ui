import {RelationData} from "@/model/relation";
import {duckDBTypeToValueType} from "@/model/value-type";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {DataSource} from "@/model/data-source-connection";
import {QueryResponse} from "@/model/query-response";
import {ConnectionStatus, DatabaseConnection} from "@/model/database-connection";
import {DatabaseConnectionType} from "@/state/connections-database/configs";

export function getDuckDBLocalConnection(config: DuckDBOverHttpConfig): DatabaseConnection {

    return new DuckDBOverHttp(config, DATABASE_CONNECTION_ID_DUCKDB_LOCAL);
}

export interface DuckDBOverHttpConfig {
    name: string;
    url: string;
    authentication: 'none' | 'token';

    // if authentication is token, these fields are required
    token?: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

class DuckDBOverHttp implements DatabaseConnection {

    id: string;
    type: DatabaseConnectionType;
    config: DuckDBOverHttpConfig;

    connectionStatus: ConnectionStatus = {state: 'disconnected', message: 'ConnectionState not initialised'};
    dataSources: DataSource[] = [];

    constructor(config: DuckDBOverHttpConfig, id: string) {
        this.id = id;
        this.config = config;
        this.type = 'duckdb-over-http';
    }

    async sendPing(): Promise<boolean> {
        try {
            await this.sendQuery("SELECT 1;");
            return true;
        } catch (e) {
            return false;
        }
    }

    async sendQuery(query: string): Promise<RelationData> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.config.authentication === 'token') {
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

    async checkConnectionState(): Promise<ConnectionStatus> {
        const ok = await this.sendPing();
        if (ok) {
            this.connectionStatus = {state: 'connected'};
        } else {
            this.connectionStatus = {state: 'error', message: `Failed to ping ${this.config.url}`};
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

