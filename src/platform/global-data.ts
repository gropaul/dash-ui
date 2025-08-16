// the time in milliseconds to wait before showing the loading spinner
import {StorageDestination} from "@/model/database-connection";

export const LOADING_TIMER_OFFSET = 150;

export const DASH_DOMAIN = 'dash.builders'

// connection ids
export const DATABASE_CONNECTION_ID_DUCKDB_WASM = 'duckdb-wasm';
export const DATABASE_CONNECTION_ID_DUCKDB_LOCAL = 'duckdb-local';
export const SOURCE_CONNECTION_ID_DUCKDB_FILE_SYSTEM = 'filesystem';
export const MAIN_CONNECTION_ID = DATABASE_CONNECTION_ID_DUCKDB_LOCAL;


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

export const DEFAULT_RELATION_VIEW_PATH =[]

export const DEFAULT_STATE_SCHEMA_NAME = 'dash';

export const DEFAULT_STATE_STORAGE_DESTINATION: StorageDestination = {
    tableName: 'relationState',
    schemaName: DEFAULT_STATE_SCHEMA_NAME,
}