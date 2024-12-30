import {ConnectionsService} from "@/state/connections/connections-service";
import {getDuckDBLocalConnection} from "@/state/connections/duckdb-over-http";
import {StateStorage} from "zustand/middleware";
import {CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {RelationData} from "@/model/relation";


class DuckDBProvider {

    createdTables: string[] = [];
    // singleton instance
    private static instance: DuckDBProvider;

    connectionId: string = CONNECTION_ID_DUCKDB_LOCAL;

    private constructor() {
    }

    getOrWaitForConnection() {
        if (!ConnectionsService.getInstance().hasConnection(this.connectionId)) {
            ConnectionsService.getInstance().addConnectionIfNotExists(getDuckDBLocalConnection());
        }

        return ConnectionsService.getInstance().getConnection(this.connectionId);
    }

    async createTableIfNotExists(tableName: string) {
        // create table if not exists
        if (!this.createdTables.includes(tableName)) {
            const data = await this.executeQuery(`CREATE TABLE IF NOT EXISTS "${tableName}" (id INT PRIMARY KEY, value JSON, time TIMESTAMP);`);

            this.createdTables.push(tableName);
        }
    }

    async executeQuery(query: string): Promise<RelationData> {
        const connection = await this.getOrWaitForConnection();
        return connection.executeQuery(query);
    }

    static async getInstance(): Promise<DuckDBProvider> {

        if (!DuckDBProvider.instance) {
            DuckDBProvider.instance = new DuckDBProvider();
        }

        return DuckDBProvider.instance;
    }
}


export const duckdbStorage: StateStorage = {
    getItem: async (tableName: string): Promise<string | null> => {
        const provider = await DuckDBProvider.getInstance();
        await provider.createTableIfNotExists(tableName);
        const query = `SELECT value FROM "${tableName}" LIMIT 1;`;
        const data = await provider.executeQuery(query);

        if (data.rows.length === 0) {
            return null;
        }

        return data.rows[0][0];
    },
    setItem: async (tableName: string, value: string): Promise<void> => {

        // escape single quotes in value
        value = value.replace(/'/g, "''");

        const provider = await DuckDBProvider.getInstance();
        await provider.createTableIfNotExists(tableName);

        const query = `
            INSERT INTO "${tableName}"
            VALUES (0, '${value}', NOW()) ON CONFLICT DO
            UPDATE SET value = EXCLUDED.value, time = NOW();
        `;
        await provider.executeQuery(query);
    },
    removeItem: async (tableName: string): Promise<void> => {
        const provider = await DuckDBProvider.getInstance();
        await provider.createTableIfNotExists(tableName);

        await provider.executeQuery(`DELETE
                                     FROM "${tableName};"`);
    },
}