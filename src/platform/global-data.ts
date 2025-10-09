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
    "#ea5545",
    "#edbf33",
    "#ede15b",
    "#bdcf32",
    "#87bc45",
    "#27aeef",
    "#b33dc6",
    "#f46a9b",
]

export interface LLMSettings {
    maxMessagesToPrompt: number; // maximum number of messages to prompt the LLM with
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
    maxMessagesToPrompt: 8, // always + 1 if there is a system prompt
}

export const N_RELATIONS_DATA_TO_LOAD = 1;

export const DEFAULT_RELATION_VIEW_PATH =[]

export const DEFAULT_STATE_SCHEMA_NAME = 'dash';

export const DEFAULT_STATE_STORAGE_DESTINATION: StorageDestination = {
    tableName: 'relationState',
    schemaName: DEFAULT_STATE_SCHEMA_NAME,
}

export const ERROR_MESSAGE_QUERY_ABORTED = 'Query aborted by user';