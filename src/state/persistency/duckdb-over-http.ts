import {ConnectionsService} from "@/state/connections-service";
import {createJSONStorage, StateStorage} from "zustand/middleware";
import {RelationData} from "@/model/relation";
import {AsyncQueue} from "@/platform/async-queue";
import {DatabaseConnection, StateStorageInfo, StorageDestination} from "@/model/database-connection";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";
import {useRelationsState} from "@/state/relations.state";
import {RelationState} from "@/model/relation-state";


export function GetFullNameDestination(destination: StorageDestination) {
    if (destination.databaseName) {
        return `"${destination.databaseName}"."${destination.schemaName}"."${destination.tableName}"`;
    } else {
        return `"${destination.schemaName}"."${destination.tableName}"`;
    }
}

export function GetFullName(storageInfo: StateStorageInfo) {
    return GetFullNameDestination(storageInfo.destination);
}

export async function GetStateStorageStatus(destination: StorageDestination, connection: DatabaseConnection): Promise<StateStorageInfo> {
    const current_database_query = `SELECT (path IS NOT null) as persistent, readonly, database_name
                                    FROM duckdb_databases()
                                    WHERE database_name = current_catalog();`;
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
    storageDestination: StorageDestination,
    value: string
}

export class StorageDuckAPI {

    activeStorageInfo: StateStorageInfo | null = null;
    createdTables: string[] = [];    // singleton instance
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


        if (this.activeStorageInfo === null) {
            this.activeStorageInfo = await GetStateStorageStatus(DEFAULT_STATE_STORAGE_DESTINATION, ConnectionsService.getInstance().getDatabaseConnection());
        }

        return ConnectionsService.getInstance().getDatabaseConnection();
    }

    async createTableIfNotExists(storageDestination: StorageDestination) {

        // if we are in readonly mode, do not create the table
        if (this.activeStorageInfo!.databaseReadonly) {
            return;
        }

        const tableName = GetFullNameDestination(storageDestination);
        // create table if not exists
        if (!this.createdTables.includes(tableName)) {
            await this.executeQuery(`INSTALL json`); // load the json extension
            await this.executeQuery(`LOAD json`); // load the json extension

            // create schema dash if not exists
            await this.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${storageDestination.schemaName};`);
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

    async loadVersionFromServer(storageDestination: StorageDestination) {
        // only update if the version is still valid
        const tableName = GetFullNameDestination(storageDestination);
        const data = await this.executeQuery(`SELECT version
                                              FROM ${tableName};`);
        let versionCode: number | null = null;
        if (data.rows.length > 0) {
            versionCode = new Date(data.rows[0][0]).getTime();
        }
        return versionCode;
    }

    isVersionValid(versionCode: number | null) {
        return versionCode === this.lastVersionCode;
    }

    async getItem(storageDestination: StorageDestination): Promise<string | null> {
        const tableName = GetFullNameDestination(storageDestination);

        await this.createTableIfNotExists(storageDestination);
        const query = `SELECT value, version
                       FROM ${tableName} LIMIT 1;`;
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

    async setItem(storageDestination: StorageDestination, value: string): Promise<void> {

        // not allowed to write in readonly mode
        if (this.activeStorageInfo!.databaseReadonly) {
            return;
        }

        return this.queue.add({storageDestination, value});
    }

    private async setItemInternal(input: QueueInput): Promise<void> {

        let {storageDestination, value} = input;
        // escape single quotes in value
        value = value.replace(/'/g, "''");

        await this.createTableIfNotExists(storageDestination);

        // check if the version is still valid
        const versionCode = await this.loadVersionFromServer(storageDestination);
        const tableName = GetFullNameDestination(storageDestination);

        if (this.isVersionValid(versionCode)) {
            const query = `
                INSERT INTO ${tableName}
                VALUES (0, '${value}', NOW()) ON CONFLICT DO
                UPDATE SET value = EXCLUDED.value, version = NOW();
            `;
            await this.executeQuery(query);

            // get the current version, if null then error
            const newVersionCode = await this.loadVersionFromServer(storageDestination);
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
        return provider.getItem(provider.activeStorageInfo!.destination);
    },
    setItem: async (_tableName: string, value: string): Promise<void> => {
        const provider = await StorageDuckAPI.getInstance();
        return provider.setItem(provider.activeStorageInfo!.destination, value);
    },
    removeItem: async (_tableName: string): Promise<void> => {
        const provider = await StorageDuckAPI.getInstance();
        await provider.createTableIfNotExists(provider.activeStorageInfo!.destination);
        const tableName = GetFullNameDestination(provider.activeStorageInfo!.destination);
        await provider.executeQuery(`DELETE
                                     FROM ${tableName};`);
    },
}