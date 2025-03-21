import {RelationData} from "@/model/relation";
import {DatabaseConnectionType} from "@/state/connections-database/configs";

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

export interface StateStorageInfo {
    tableStatus: TableStateStorageStatus;
    databaseStatus: DatabaseStateStorageStatus;
    databaseReadonly: boolean;
    destination: StorageDestination;
}

export type DataConnectionConfig = { [key: string]: string | number | boolean | undefined };

//! A DatabaseConnection manages the connection to a database. Only one DatabaseConnection can be active at a time.
//! DatabaseConnection can be e.g. LocalDuckdb, DuckDBWasm, but in the future maybe also Postgres, MySQL, etc.
export interface DatabaseConnection {
    id: string;

    config: DataConnectionConfig

    type: DatabaseConnectionType;
    connectionStatus: ConnectionStatus;

    executeQuery: (query: string) => Promise<RelationData>;
    initialise: () => Promise<ConnectionStatus>;
    checkConnectionState: () => Promise<ConnectionStatus>;

    updateConfig: (config: Partial<DataConnectionConfig>) => void;
    stateStorageInfo?: StateStorageInfo;
}