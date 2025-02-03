import {ConnectionsService} from "@/state/connections/connections-service";
import {getDuckDBLocalConnection} from "@/state/connections/duckdb-over-http";
import {StateStorage} from "zustand/middleware";
import {CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";


interface QueueInput {
    tableName: string,
    value: string
}

export class DuckDBProvider {

    createdTables: string[] = [];
    // singleton instance
    private static instance: DuckDBProvider;


    connectionId: string = CONNECTION_ID_DUCKDB_LOCAL;
    lastVersionCode: number | null = null;
    queue: AsyncQueue<QueueInput, void>;

    onForceReloadCallback: () => void = () => {};

    private constructor() {
        // weird way of adding the function to ensure that the 'this' context is correct
        this.queue = new AsyncQueue<QueueInput, void>((input) => this.setItemInternal(input));
    }

    setOnForceReloadCallback(callback: () => void) {
        this.onForceReloadCallback = callback;
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
            const data = await this.executeQuery(`CREATE TABLE IF NOT EXISTS "${tableName}"
                                                  (
                                                      id
                                                      INT
                                                      PRIMARY
                                                      KEY,
                                                      value
                                                      JSON,
                                                      version
                                                      TIMESTAMP
                                                  );`);

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

    updateVersion(versionCode: number) {
        this.lastVersionCode = versionCode;
    }

    async loadVersionFromServer(tableName: string) {
        // only update if the version is still valid
        const data = await this.executeQuery(`SELECT version
                                              FROM "${tableName}";`);
        let versionCode: number | null = null;
        if (data.rows.length > 0) {
            versionCode = new Date(data.rows[0][0]).getTime();
        }
        return versionCode;
    }

    isVersionValid(versionCode: number | null) {
        return versionCode === this.lastVersionCode;
    }

   async getItem(tableName: string): Promise<string | null> {

        await this.createTableIfNotExists(tableName);
        const query = `SELECT value, version
                       FROM "${tableName}" LIMIT 1;`;
        const data = await this.executeQuery(query);

        if (data.rows.length === 0) {
            return null;
        }

        const jsonString = data.rows[0][0];
        const date = data.rows[0][1];
        const versionCode = new Date(date).getTime();

        // get can always read the version
        this.updateVersion(versionCode);

        return jsonString;
    }

    async setItem(tableName: string, value: string): Promise<void> {
        return this.queue.add({tableName, value});
    }

    private async setItemInternal(input: QueueInput): Promise<void> {

        let {tableName, value} = input;
        // escape single quotes in value
        value = value.replace(/'/g, "''");

        await this.createTableIfNotExists(tableName);

        // check if the version is still valid
        const versionCode = await this.loadVersionFromServer(tableName);
        if (this.isVersionValid(versionCode)) {
            const query = `
                INSERT INTO "${tableName}"
                VALUES (0, '${value}', NOW()) ON CONFLICT DO
                UPDATE SET value = EXCLUDED.value, version = NOW();
            `;
            await this.executeQuery(query);

            // get the current version, if null then error
            const newVersionCode = await this.loadVersionFromServer(tableName);
            if (newVersionCode === null) {
                throw new Error("Could not get version code, there should be one after the insert");
            }
            this.updateVersion(newVersionCode);
        } else {
            this.onForceReloadCallback()
        }
    }
}


export const duckdbStorage: StateStorage = {
    getItem: async (tableName: string): Promise<string | null> => {
        const provider = await DuckDBProvider.getInstance();
        return provider.getItem(tableName);
    },
    setItem: async (tableName: string, value: string): Promise<void> => {
        const provider = await DuckDBProvider.getInstance();
        return provider.setItem(tableName, value);
    },
    removeItem: async (tableName: string): Promise<void> => {
        const provider = await DuckDBProvider.getInstance();
        await provider.createTableIfNotExists(tableName);
        await provider.executeQuery(`DELETE
                                     FROM "${tableName};"`);
    },
}