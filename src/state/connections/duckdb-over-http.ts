import {
    DataConnection, DataConnectionState,
    DataSource,
    DataSourceElement,
    DataSourceGroup,
    DBConnectionType
} from "@/state/connections.state";
import {getRelationId, getRows, iterateColumns, Relation, RelationData} from "@/model/relation";
import Error from "next/error";
import {json} from "node:stream/consumers";
import {duckDBTypeToValueType} from "@/model/value-type";
import {loadDuckDBDataSources} from "@/state/connections/duckdb-helper";

export interface DuckDBLocalConfig {
    url: string;
    name: string;
    id: string;
}

export function parseListString(listString: string): string[] {
    // remove [ and ] from string
    console.log(listString);
    const listStringWithoutBrackets = listString.slice(1, -1);
    console.log(listStringWithoutBrackets);
    return listStringWithoutBrackets.split(", ");

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

    async sendPing(): Promise<boolean> {
        try {
            await this.sendQuery("SELECT 1;");
            return true;
        } catch (e) {
            return false;
        }
    }

    async sendQuery(query: string): Promise<RelationData> {
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
            columns: meta.map((column: any) => {
                return {
                    name: column.name,
                    type: duckDBTypeToValueType(column.type),
                }
            }),
            rows
        }
    }

    executeQuery(query: string): Promise<RelationData> {
        return this.sendQuery(query);
    }

    async loadDataSources(): Promise<DataSource[]> {
        return loadDuckDBDataSources((query) => this.executeQuery(query));
    }

    async getConnectionState(): Promise<DataConnectionState> {
        const ok = await this.sendPing();
        return ok ? 'connected' : 'disconnected';
    }

    initialise(): Promise<DataConnectionState> {
        // no initialisation needed
        return this.getConnectionState();
    }
}

export function getDuckDBLocalConnection() {
    return new DuckDBOverHttp({
        url: "http://localhost:4200/",
        name: "DuckDB Local",
        id: "duckdb-local"
    });
}
