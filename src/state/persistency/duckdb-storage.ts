import {ConnectionsService} from "@/state/connections/connections-service";
import {StateStorage} from "zustand/middleware";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";
import {
    DatabaseConnection,
    DefaultStateStorageInfo,
    StateStorageInfo, StateStorageInfoLoaded,
    StorageDestination
} from "@/model/database-connection";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";


export function GetFullNameDestination(destination: StorageDestination) {
    if (destination.databaseName) {
        return `"${destination.databaseName}"."${destination.schemaName}"."${destination.tableName}"`;
    } else {
        return `"${destination.schemaName}"."${destination.tableName}"`;
    }
}

export async function GetStateStorageStatus(destination: StorageDestination, executeQuery: (query: string) => Promise<RelationData>): Promise<StateStorageInfoLoaded> {
    const current_database_query = `SELECT (path IS NOT null) as persistent, readonly, database_name
                                    FROM duckdb_databases()
                                    WHERE database_name = current_catalog();`;
    const current_database_result = await executeQuery(current_database_query)
    const persistent = current_database_result.rows[0][0];
    const readonly = current_database_result.rows[0][1];

    // copy the destination to ensure we don't modify the original
    const destination_copy = {...destination};
    destination_copy.databaseName = current_database_result.rows[0][2];

    return {
        state: 'loaded',
        tableStatus: 'found',
        databaseStatus: persistent ? 'permanent' : 'temporary',
        databaseReadonly: readonly,
        destination: destination_copy
    };
}


interface QueueInput {
    storageInfo: StateStorageInfoLoaded,
    value: string
}

export class StorageDuckAPI {

    createdTables: string[] = [];
    private static instance: StorageDuckAPI;

    lastVersionCode: number | null = null;
    queue: AsyncQueue<QueueInput, void>;

    onForceReloadCallback: () => void = () => {
    };

    private constructor() {
        // weird way of adding the function to ensure that the 'this' context is correct
        this.queue = new AsyncQueue<QueueInput, void>((input) => this.setItemInternal(input));
    }

    setOnForceReloadCallback(callback: () => void) {
        this.onForceReloadCallback = callback;
    }

    async getOrWaitForConnection(): Promise<DatabaseConnection> {
        // wait for the connection to be initialised
        while (!ConnectionsService.getInstance().hasDatabaseConnection()) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return ConnectionsService.getInstance().getDatabaseConnection();
    }

    async getActiveStorageInfo(): Promise<StateStorageInfoLoaded> {
        const connection = await this.getOrWaitForConnection();
        if (connection.storageInfo.state === 'loaded') {
            return connection.storageInfo;
        }

        throw new Error("Storage info not loaded but connection initialised. This should not happen.");

    }

    async createTableIfNotExists(storageInfo: StateStorageInfoLoaded){

        // if we are in readonly mode, do not create the table
        if (storageInfo.databaseReadonly) {
            return;
        }

        const tableName = GetFullNameDestination(storageInfo.destination);
        // create table if not exists
        if (!this.createdTables.includes(tableName)) {
            try {
                await this.executeQuery(`INSTALL json`); // load the json extension
            } catch (e) {
                console.warn('Unable to install json. As long is loading works, this is not a problem')
            }

            try {
                await this.executeQuery(`LOAD json`); // load the json extension
            } catch (e) {
                console.error('Unable to load json exception. This means we can not store stuff')
            }

            // create schema dash if not exists
            await this.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${storageInfo.destination.schemaName};`);
            const data = await this.executeQuery(`CREATE TABLE IF NOT EXISTS ${tableName}
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

    static async getInstance(): Promise<StorageDuckAPI> {

        if (!StorageDuckAPI.instance) {
            StorageDuckAPI.instance = new StorageDuckAPI();
        }

        await StorageDuckAPI.instance.getOrWaitForConnection();

        return StorageDuckAPI.instance;
    }

    updateVersion(versionCode: number) {
        this.lastVersionCode = versionCode;
    }

    async loadVersionFromServer() {
        // only update if the version is still valid
        const storageInfo = await this.getActiveStorageInfo()
        const tableName = GetFullNameDestination(storageInfo.destination);
        const data = await this.executeQuery(`SELECT version FROM ${tableName};`);
        let versionCode: number | null = null;
        if (data.rows.length > 0) {
            versionCode = new Date(data.rows[0][0]).getTime();
        }
        return versionCode;
    }

    isVersionValid(versionCode: number | null) {
        return versionCode === this.lastVersionCode;
    }

    async getItem(): Promise<string | null> {
        const storageInfo = await this.getActiveStorageInfo()
        const tableName = GetFullNameDestination(storageInfo.destination);
        await this.createTableIfNotExists(storageInfo);
        const query = `SELECT value, version
                       FROM ${tableName} LIMIT 1;`;
        const data = await this.executeQuery(query);

        if (data.rows.length === 0) {
            return null;
        }

        const json = data.rows[0][0];
        // if this is not a string, we have to serialize it. WASM returns a string, while http returns json
        const jsonString = typeof json === "string" ? json : JSON.stringify(json);

        const date = data.rows[0][1];
        const versionCode = new Date(date).getTime();

        // get can always read the version
        this.updateVersion(versionCode);

        return jsonString;
    }

    async setItem(value: string): Promise<void> {
        const storageInfo = await this.getActiveStorageInfo();

        // not allowed to write in readonly mode
        if (storageInfo.databaseReadonly) {
            return;
        }

        return this.queue.add({storageInfo: storageInfo, value});
    }

    private async setItemInternal(input: QueueInput): Promise<void> {

        let {storageInfo, value} = input;
        // escape single quotes in value
        value = value.replace(/'/g, "''");

        const storageDestination = storageInfo.destination;
        await this.createTableIfNotExists(storageInfo);

        // check if the version is still valid
        const versionCode = await this.loadVersionFromServer();
        const tableName = GetFullNameDestination(storageDestination);

        if (this.isVersionValid(versionCode)) {
            const insertQuery = `
                INSERT INTO ${tableName}
                VALUES (0, '${value}', NOW()) ON CONFLICT DO
                UPDATE SET value = EXCLUDED.value, version = NOW();
            `;

            await this.executeQuery(insertQuery);
            await this.executeQuery('CHECKPOINT');

            // get the current version, if null then error
            const newVersionCode = await this.loadVersionFromServer();
            if (newVersionCode === null) {
                throw new Error("Could not get version code, there should be one after the insert");
            }
            this.updateVersion(newVersionCode);
        } else {
            this.onForceReloadCallback()
        }
    }
}


export const duckdbOverHttpStorageProvider: StateStorage = {
    getItem: async (_tableName: string): Promise<string | null> => {
        const provider = await StorageDuckAPI.getInstance();
        return provider.getItem();
    },
    setItem: async (_tableName: string, value: string): Promise<void> => {
        const provider = await StorageDuckAPI.getInstance();
        return provider.setItem(value);
    },
    removeItem: async (_tableName: string): Promise<void> => {
        const provider = await StorageDuckAPI.getInstance();
        const storageInfo = await provider.getActiveStorageInfo();

        await provider.createTableIfNotExists(storageInfo);

        const tableName = GetFullNameDestination(storageInfo.destination);
        await provider.executeQuery(`DELETE FROM ${tableName};`);
    },
}