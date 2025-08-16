import {RelationData} from "@/model/relation";
import {DatabaseConnectionType} from "@/state/connections-database/configs";
import {GetStateStorageStatus} from "@/state/persistency/duckdb-over-http";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";

export interface ConnectionStatus {
    state: 'connected' | 'disconnected' | 'connecting' | 'error';
    message?: string;
    version?: string;
}

export interface StorageDestination {
    tableName: string;
    schemaName: string;
    databaseName?: string;
}


export type TableStateStorageStatus = 'found' | 'not_found';
export type DatabaseStateStorageStatus = 'not_found' | 'temporary' | 'permanent';

export interface StateStorageInfoUninitialized {
    state: 'uninitialized';
    destination: StorageDestination;
}


export interface StateStorageInfoLoaded {
    state: 'loaded';
    tableStatus: TableStateStorageStatus;
    databaseStatus: DatabaseStateStorageStatus;
    databaseReadonly: boolean;
    destination: StorageDestination;
}

export function DefaultStateStorageInfo(): StateStorageInfo {
    return {
        state: 'uninitialized',
        destination: DEFAULT_STATE_STORAGE_DESTINATION
    };
}

export type StateStorageInfo = StateStorageInfoUninitialized | StateStorageInfoLoaded;


export type DataConnectionConfig = { [key: string]: string | number | boolean | undefined };

//! A DatabaseConnection manages the connection to a database. Only one DatabaseConnection can be active at a time.
//! DatabaseConnection can be e.g. LocalDuckdb, DuckDBWasm, but in the future maybe also Postgres, MySQL, etc.
export interface DatabaseConnection {
    id: string;

    config: DataConnectionConfig

    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus;
    storageInfo: StateStorageInfo;

    initialise: () => Promise<ConnectionStatus>;
    checkConnectionState: () => Promise<ConnectionStatus>;

    updateConfig: (config: Partial<DataConnectionConfig>) => void;

    executeQuery: (query: string) => Promise<RelationData>;
    mountFiles: (files: File[]) => Promise<void>;

    destroy: () => Promise<void>;
}