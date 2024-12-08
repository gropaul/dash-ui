import {RelationData} from "@/model/relation";
import Error from "next/error";
import {duckDBTypeToValueType} from "@/model/value-type";
import {loadDuckDBDataSources, onDuckDBDataSourceClick} from "@/state/connections/duckdb-helper";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {validateUrl} from "@/platform/string-validation";
import {ConnectionStringField, showConnectionStringIfLocalHost} from "@/state/connections/duckdb-over-http/widgets";
import {CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {ConnectionStatus, DataConnection, DataSource, DBConnectionType} from "@/model/connection";

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
    authentication: 'password' | 'token';

    // if authentication is password, these fields are required
    username?: string;
    password?: string;

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
                    {label: 'Password', value: 'password'},
                    {label: 'Token', value: 'token'}
                ]
            },
            {
                type: 'text',
                label: 'Username',
                key: 'username',
                required: true,
                condition: (formData) => formData['authentication'] === 'password'
            },
            {
                type: 'password',
                label: 'Password',
                key: 'password',
                required: true,
                condition: (formData) => formData['authentication'] === 'password'
            },
            {
                type: 'password',
                label: 'Token',
                key: 'token',
                required: true,
                condition: (formData) => formData['authentication'] === 'token'
            },
            {
                type: 'custom',
                label: 'Connection String',
                key: 'connectionString',
                required: false,
                validation: () => undefined,
                condition: showConnectionStringIfLocalHost,
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
        let requestURL = `${this.config.url}?add_http_cors_header=1&default_format=JSONCompact`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        if (this.config.authentication === 'password') {
            const username = this.config.username!;
            const password = this.config.password!;
            headers['Authorization'] = 'Basic ' + btoa(`${username}:${password}`);
        } else if (this.config.authentication === 'token') {
            headers['X-API-Key'] = this.config.token!;
        } else if (this.config.authentication !== 'none') {
            // @ts-ignore
            throw new Error(`Unsupported authentication type: ${this.config.authentication}`);
        }

        const response = await fetch(requestURL, {
            method: 'POST',
            body: query,
            headers
        });

        if (!response.ok) {
            // @ts-ignore
            throw new Error(`Failed to execute query: ${response.statusText}`);
        }

        const json = await response.json();
        const rows = json.data;
        const meta = json.meta;

        return {
            columns: meta.map((column: any) => ({
                name: column.name,
                type: duckDBTypeToValueType(column.type),
            })),
            rows
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

