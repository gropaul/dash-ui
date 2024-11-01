import {
    DataConnection,
    DataSource,
    DataSourceElement,
    DataSourceGroup,
    DBConnectionType
} from "@/state/connections.state";
import {getRows, iterateColumns, Relation} from "@/model/relation";
import Error from "next/error";
import {json} from "node:stream/consumers";

export interface DuckDBLocalConfig {
    url: string;
    name: string;
    id: string;
}

class DuckDBOverHttp implements DataConnection {

    id: string;
    name: string;
    url: string;
    type: DBConnectionType;
    dataSources: DataSource[];

    constructor(config: DuckDBLocalConfig) {
        this.name = config.name;
        this.id = config.id;
        this.url = config.url;
        this.type = 'duckdb-over-http';
        this.dataSources = [];
    }

    async sendQuery(query: string): Promise<Relation> {
        const requestURL = this.url + '?add_http_cors_header=1&default_format=JSONCompact';
        const response = await fetch(requestURL, {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' // You may need to set this depending on your server requirements
            }
        });

        if (!response.ok) {
            // @ts-ignore
            throw new Error(`Failed to execute query: ${response.statusText}`);
        }

        const json = await response.json();
        const rows = json.data; // contains list of rows, row = list of any
        const meta = json.meta; // contains column information, list of {name: string, type: string}

        return {
            name: "Result",
            columns: meta.map((column: any) => {
                return {
                    name: column.name,
                    type: column.type,
                }
            }),
            rows
        }
    }

    executeQuery(query: string): Promise<Relation> {
        return this.sendQuery(query);
    }

    async getDataSources(): Promise<DataSource[]> {
        // first get all tables
        const queryGetDatabases = `SHOW DATABASES`;
        const databases = await this.executeQuery(queryGetDatabases);

        const queryGetTables = `SHOW ALL TABLES;`;
        const tables = await this.executeQuery(queryGetTables);

        const rows = getRows(tables, ['database', 'name', 'column_names', 'column_types']);

        const dataGroups: DataSourceGroup[] = [];

        iterateColumns(databases, ['database_name'], async ([database]) => {
            const rowsOfDatabase = rows.filter(([rowDatabase]) => rowDatabase === database);
            const tables: DataSourceElement[] = rowsOfDatabase.map(([_, name, column_names, column_types]) => {
                return {
                    type: 'relation',
                    name,
                    columnNames: column_names,
                    columnTypes: column_types
                }
            });

            dataGroups.push({
                type: 'database',
                name: database,
                children: tables
            });
        });
        return dataGroups;
    }


}

export function getDuckDBLocalConnection() {
    return new DuckDBOverHttp({
        url: "http://localhost:4200/",
        name: "DuckDB Local",
        id: "duckdb-local"
    });
}
