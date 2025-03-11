import {ConnectionsService} from "@/state/connections-service";
import {StateStorage} from "zustand/middleware";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";
import {DatabaseConnection, StateStorageInfo, StorageDestination} from "@/model/database-connection";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";


export function GetFullNameDestination(destination: StorageDestination) {
    if (destination.databaseName) {
        return `${destination.databaseName}.${destination.schemaName}.${destination.tableName}`;
    } else {
        return `${destination.schemaName}.${destination.tableName}`;
    }
}

export function GetFullName(storageInfo: StateStorageInfo) {
    return GetFullNameDestination(storageInfo.destination);
}

export async function GetStateStorageStatus(destination: StorageDestination, connection: DatabaseConnection): Promise<StateStorageInfo>  {
    const current_database_query = `SELECT (path IS NOT null) as persistent, readonly, database_name FROM duckdb_databases() WHERE database_name = current_catalog();`;
    const current_database_result = await connection.executeQuery(current_database_query)
    const persistent = current_database_result.rows[0][0];
    const readonly = current_database_result.rows[0][1];
    destination.databaseName = current_database_result.rows[0][2];

    return {
        tableStatus: 'found',
        databaseStatus: persistent ? 'permanent' : 'temporary',
        databaseReadonly: readonly,
        destination: destination
    };
}


interface QueueInput {
    tableName: string,
    value: string
}

export class StorageDuckAPI {

    activeStorageInfo: StateStorageInfo | null = null;
    createdTables: string[] = [];    // singleton instance
    private static instance: StorageDuckAPI;

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

    async getOrWaitForConnection(): Promise<DatabaseConnection> {
        // wait for the connection to be initialised
        while (!ConnectionsService.getInstance().hasDatabaseConnection()) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }


        if (this.activeStorageInfo === null) {
            console.log("Connection established, getting active storage info")
            this.activeStorageInfo = await GetStateStorageStatus(DEFAULT_STATE_STORAGE_DESTINATION, ConnectionsService.getInstance().getDatabaseConnection());
            console.log(this.activeStorageInfo)
        }

        return ConnectionsService.getInstance().getDatabaseConnection();
    }

    async createTableIfNotExists(tableName: string) {

        // if we are in readonly mode, do not create the table
        if (this.activeStorageInfo!.databaseReadonly) {
            return;
        }

        // create table if not exists
        if (!this.createdTables.includes(tableName)) {
            await this.executeQuery(`INSTALL json`); // load the json extension
            await this.executeQuery(`LOAD json`); // load the json extension
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

        // not allowed to write in readonly mode
        if (this.activeStorageInfo!.databaseReadonly) {
            return;
        }

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
    getItem: async (_tableName: string): Promise<string | null> => {
        const provider = await StorageDuckAPI.getInstance();
        const tableName = GetFullName(provider.activeStorageInfo!);
        return provider.getItem(tableName);
    },
    setItem: async (_tableName: string, value: string): Promise<void> => {
        const provider = await StorageDuckAPI.getInstance();
        const tableName = GetFullName(provider.activeStorageInfo!);
        return provider.setItem(tableName, value);
    },
    removeItem: async (_tableName: string): Promise<void> => {
        const provider = await StorageDuckAPI.getInstance();
        const tableName = GetFullName(provider.activeStorageInfo!);
        await provider.createTableIfNotExists(tableName);
        await provider.executeQuery(`DELETE FROM "${tableName};"`);
    },
}