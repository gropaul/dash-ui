// the time in milliseconds to wait before showing the loading spinner

import {StorageDestination} from "../model/database-connection";

export const DASH_STORAGE_VERSION = 1 // increment this if there are breaking changes to the storage format
export const LOADING_TIMER_OFFSET_MS = 150; // how long the query needs to run before showing the loading spinner [ms]

export const STORAGE_THROTTLE_TIME_MS = 2_000; // how long to wait before saving the state again [ms]

export const DASH_DOMAIN = 'app.dash.builders'

// connection ids
export const DATABASE_CONNECTION_ID_DUCKDB_WASM = 'duckdb-wasm';
export const DATABASE_CONNECTION_ID_DUCKDB_LOCAL = 'duckdb-local';
export const SOURCE_CONNECTION_ID_DUCKDB_FILE_SYSTEM = 'filesystem';
export const MAIN_CONNECTION_ID = DATABASE_CONNECTION_ID_DUCKDB_LOCAL;


export const VERSION_CONFLICT_ERROR = 'Version conflict, the data has been modified by another tab or user.'

export const CHART_QUERY_LIMIT = 50_000;


export const DEFAULT_COLORS = [
    "#6366f1",
    "#f43f5e",
    "#0ea5e9",
    "#f59e0b",
    "#10b981",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
]

export interface LLMSettings {
    maxMessagesToPrompt: number; // maximum number of messages to prompt the LLM with
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
    maxMessagesToPrompt: 8, // always + 1 if there is a system prompt
}

export const N_RELATIONS_DATA_TO_LOAD = 20;

export const DEFAULT_RELATION_VIEW_PATH =[]

export const DEFAULT_STATE_SCHEMA_NAME = 'dash';

export const DEFAULT_STATE_STORAGE_DESTINATION: StorageDestination = {
    tableName: 'relationState',
    schemaName: DEFAULT_STATE_SCHEMA_NAME,
}

export const ERROR_MESSAGE_QUERY_ABORTED = 'Query aborted by user';

export const TABLE_FOOTER_SMALL_WIDTH_THRESHOLD = 512;

// minimum distance from node center for relation handles to become active, in pixels
export const WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE = 64;

// Table macro configuration
export const TABLE_MACRO_PREFIX = 'node_';

// SQL editor debounce time for local code changes in milliseconds
export const SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS = 300;