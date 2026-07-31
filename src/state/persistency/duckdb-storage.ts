import {ConnectionsService} from "@/state/connections/connections-service";
import {StateStorage} from "zustand/middleware";
import {RelationData} from "@/model/relation";
import {throttleLatest} from "@/lib/throttle-latest";
import {
    DatabaseConnection,
    DefaultLoadedStorageInfo,
    StateStorageInfoLoaded,
    StorageDestination
} from "@/model/database-connection";
import {
    DASH_STORAGE_VERSION,
    DEFAULT_STATE_STORAGE_DESTINATION,
    STORAGE_THROTTLE_TIME_MS,
    VERSION_CONFLICT_ERROR
} from "@/platform/global-data";
import {useSaveStatus} from "@/state/save-status.state";


export function GetFullNameDestination(destination: StorageDestination) {
    if (destination.databaseName) {
        return `"${destination.databaseName}"."${destination.schemaName}"."${destination.tableName}"`;
    } else {
        return `"${destination.schemaName}"."${destination.tableName}"`;
    }
}

interface Input {
    value: string
}

export class StorageDuckAPI {

    createdTables: string[] = [];
    private static instance: StorageDuckAPI;

    lastVersionCode: number | null = null;
    throttledSetItem: ((input: Input) => Promise<void>) & { cancel: () => void };

    onForceReloadCallback: () => void = () => {
    };

    private constructor() {
        this.throttledSetItem = throttleLatest(this.setItemInternal.bind(this), STORAGE_THROTTLE_TIME_MS);
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
        await this.getOrWaitForConnection();
        return DefaultLoadedStorageInfo();
    }

    async createTableIfNotExists(storageInfo: StateStorageInfoLoaded) {

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
            const schemaFullName = storageInfo.destination.databaseName
                ? `"${storageInfo.destination.databaseName}"."${storageInfo.destination.schemaName}"`
                : storageInfo.destination.schemaName;
            await this.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${schemaFullName};`);

            const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName}
                                      (
                                          id
                                          INT
                                          PRIMARY
                                          KEY,
                                          value
                                          JSON,
                                          version
                                          UINT64,
                                          dash_storage_version
                                          UINT64
                                      );`

            // if the table did not exist, we have to create an initial row
            const data = await this.executeQuery(createTableQuery);

            await this.executeQuery(`INSERT INTO ${tableName} (id, value, version, dash_storage_version)
                                     SELECT 0, '{}', 0, ${DASH_STORAGE_VERSION}
                                     WHERE NOT EXISTS(SELECT 1
                                                      FROM ${tableName}
                                                      WHERE id = 0);`);


            this.createdTables.push(tableName);
        }
    }

    async executeQuery(query: string): Promise<RelationData> {
        const connection = await this.getOrWaitForConnection();
        return connection.executeQuery(query, false);
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

    /**
     * Reset all cached state that is tied to a specific dash file, called when switching projects.
     * Cancels any *scheduled* throttled write so a queued write for the outgoing project can't fire
     * against the new file, and clears the created-table / version caches so the next read/write
     * re-initialises against the new file rather than assuming the previous file's table + version.
     *
     * Note: cancel() cannot abort a setItemInternal that is already mid-query — that in-flight write
     * is instead severed by the caller's subsequent DuckdbWasmProvider.destroy(), which closes the
     * database and rejects the pending query (caught + logged in setItemInternal).
     */
    static resetForProjectSwitch() {
        const instance = StorageDuckAPI.instance;
        if (!instance) return;
        instance.throttledSetItem.cancel();
        instance.createdTables = [];
        instance.lastVersionCode = null;
        // The cancelled write will never complete to clear the indicator; the new project loads clean.
        useSaveStatus.getState().setStatus('saved');
    }

    async loadVersionFromServer() {
        // only update if the version is still valid
        const storageInfo = await this.getActiveStorageInfo()
        const tableName = GetFullNameDestination(storageInfo.destination);
        const data = await this.executeQuery(`SELECT version
                                              FROM ${tableName};`);
        let versionCode: number | null = 0;
        if (data.rows.length > 0) {
            versionCode = data.rows[0][0] as number;
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

    // Monotonic write-request counter. Each setItem() bumps it; setItemInternal() captures it at the
    // start of a flush and only reports 'saved' if no newer write arrived meanwhile (rapid edits
    // collapse through the throttle, so the last flush is the one that clears the indicator).
    private writeRequestSeq = 0;

    async setItem(value: string): Promise<void> {
        this.writeRequestSeq++;
        useSaveStatus.getState().setStatus('saving');
        // Use throttledSetItem to save only the latest
        return this.throttledSetItem({value});
    }

    private async setItemInternal(input: Input): Promise<void> {

        const seqAtStart = this.writeRequestSeq;
        console.log("Setting item in storage with throttling. Value length: ", input.value.length, ". Last version: ", this.lastVersionCode);
        const storageInfo = await this.getActiveStorageInfo();

        let {value} = input;
        // escape single quotes in value
        value = value.replace(/'/g, "''");

        const storageDestination = storageInfo.destination;
        await this.createTableIfNotExists(storageInfo);

        const tableName = GetFullNameDestination(storageDestination);

        if (this.lastVersionCode === null) {
            this.lastVersionCode = await this.loadVersionFromServer()
        }


        try {
            const insertQuery = `
                WITH checkVersion AS (SELECT version,
                                             version = ${this.lastVersionCode}                                                 AS is_valid,
                                             if(is_valid, (version + 1) % 1_000_000,
                                                error('${VERSION_CONFLICT_ERROR}')) AS newVersion,
                                             0                                                                                 as id,
                                             '${value}' as value, '${DASH_STORAGE_VERSION}' as dash_storage_version
                FROM ${tableName}
                    )
                INSERT
                INTO ${tableName}
                SELECT id, value, newVersion, dash_storage_version
                FROM checkVersion ON CONFLICT DO
                UPDATE SET
                    value = EXCLUDED.value,
                    version = EXCLUDED.version,
                    dash_storage_version = EXCLUDED.dash_storage_version
                    RETURNING version;
            `;
            const result = await this.executeQuery(insertQuery);
            const newVersion = result.rows[0][0];
            this.updateVersion(newVersion);
            // Checkpoint the catalog we actually wrote to (the state DB), not the default catalog — a
            // bare CHECKPOINT targets the current/default DB and, on WASM, leaves this write unflushed
            // in the state file's WAL. Only for a persistent (file-backed) DB — CHECKPOINT errors on an
            // in-memory database (the memory-mode fallback), where there's nothing to flush anyway.
            if (storageInfo.databaseStatus === 'permanent' && storageDestination.databaseName) {
                await this.executeQuery(`CHECKPOINT "${storageDestination.databaseName}";`);
            }

            console.log("Storage setItem completed. New version: ", newVersion);
            // Only mark 'saved' if nothing was written since this flush started; otherwise a newer
            // write is still pending (the throttle will run it and update the status then).
            if (this.writeRequestSeq === seqAtStart) {
                useSaveStatus.getState().setStatus('saved');
            }
        } catch (e) {
            // only throw if it is a version conflict
            console.warn("Storage setItem failed, likely due to version conflict. Forcing reload. Error: ", e);
            useSaveStatus.getState().setStatus('error');
            const isVersionConflict = (e as Error).message.includes(VERSION_CONFLICT_ERROR);
            if (isVersionConflict) {
                console.error("Version conflict detected. Forcing reload.");
                this.onForceReloadCallback()
            }
        }
    }
}


export const duckdbTableStorageProvider: StateStorage = {
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
        await provider.executeQuery(`DELETE
                                     FROM ${tableName};`);
    },
}