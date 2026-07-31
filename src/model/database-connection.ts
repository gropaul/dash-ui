import {RelationData} from "@/model/relation";
import {DatabaseConnectionType} from "@/state/connections/configs";
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

export function DefaultLoadedStorageInfo(): StateStorageInfoLoaded {
    return {
        state: 'loaded',
        tableStatus: 'found',
        databaseStatus: 'permanent',
        databaseReadonly: false,
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

    initialise: () => Promise<ConnectionStatus>;
    checkConnectionState: () => Promise<ConnectionStatus>;

    updateConfig: (config: Partial<DataConnectionConfig>) => void;

    executeQuery: (query: string, readOnly: boolean, formatResultToJson?: boolean) => Promise<RelationData>;
    // returns true if the query was successfully aborted, false otherwise (e.g. if there was no query to abort)
    abortQuery: () => Promise<boolean>;


    mountFiles: (files: File[]) => Promise<void>;

    destroy: () => Promise<void>;

    canHandleMultiTab: () => boolean;

    /**
     * The storage root (path prefix) under which this connection's per-project DuckDB files are
     * attached. A full attach target is composed as `${root}${fileName}`, e.g.
     * `${root}<projectId>_dash_state.duckdb`. The returned value MUST include any trailing separator.
     *
     *  - WASM / md-wasm: `"opfs://"` (files live in the OPFS root).
     *  - duckdb-over-http: the server's dash data directory + separator, e.g.
     *    `"/home/user/.duckdb/extension_data/dash/"`, discovered from the server connection.
     *
     * The URL is the source of truth for which project is open; the client attaches/detaches the
     * matching database under this root.
     */
    getStorageRoot: () => Promise<string>;
}