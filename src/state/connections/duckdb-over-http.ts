import {RelationData} from "@/model/relation";
import {duckDBTypeToValueType} from "@/model/value-type";
import {loadDuckDBDataSources, onDuckDBDataSourceClick} from "@/state/connections/duckdb-helper";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {validateUrl} from "@/platform/string-validation";
import {ConnectionStringField, showConnectionStringIfLocalHost} from "@/state/connections/duckdb-over-http/widgets";
import {CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {ConnectionStatus, DataConnection, DataSource, DBConnectionType} from "@/model/connection";
import {QueryResponse} from "@/model/query-response";

export function getDuckDBLocalConnection() {

    const config: DuckDBOverHttpConfig = {
        name: 'Local DuckDB',
        url: 'http://localhost:4200',
        authentication: 'token',
        token: 'supersecrettoken'
    }

    return new DuckDBOverHttp(config, CONNECTION_ID_DUCKDB_LOCAL);
}

export interface DuckDBOverHttpConfig {
    name: string;
    url: string;
    authentication: 'none' | 'token';

    // if authentication is token, these fields are required
    token?: string;

    [key: string]: string | number | boolean | undefined; // index signature
}

class DuckDBOverHttp implements DataConnection {

    id: string;
    type: DBConnectionType;

    config: DuckDBOverHttpConfig;

    configForm: FormDefinition = {
        fields: [
            {
                type: 'text',
                label: 'Name',
                key: 'name',
                required: true
            },
            {
                type: 'text',
                label: 'URL',
                key: 'url',
                required: true,
                validation: (rawValue: string) => validateUrl(rawValue, 'port_required')
            },
            {
                type: 'select',
                label: 'Authentication',
                key: 'authentication',
                required: true,
                selectOptions: [
                    {label: 'None', value: 'none'},
                    {label: 'Token', value: 'token'}
                ]
            },
            {
                type: 'password',
                label: 'Token',
                key: 'token',
                required: true,
                shouldValidate: (formData) => formData['authentication'] === 'token'
            },
            {
                type: 'custom',
                label: 'Connection String',
                key: 'connectionString',
                required: false,
                validation: () => undefined,
                shouldValidate: showConnectionStringIfLocalHost,
                customField: {
                    render: ConnectionStringField
                }
            }
        ]
    }

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

    async loadDataSources(): Promise<DataSource[]> {
        return loadDuckDBDataSources((query) => this.executeQuery(query));
    }

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

    async onDataSourceClick(id_path: string[]) {
        await onDuckDBDataSourceClick(this, id_path, this.dataSources);
    }

    loadChildrenForDataSource(_id_path: string[]): Promise<DataSource[]> {
        // not necessary as for dbs all the data is loaded at once!
        console.error('loadChildrenForDataSource not implemented for DuckDBOverHttp');
        return Promise.resolve([]);
    }

    async updateConfig(config: Partial<DuckDBOverHttpConfig>): Promise<void> {
        this.config = {...this.config, ...config};
    }
}

