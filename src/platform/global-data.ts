// the time in milliseconds to wait before showing the loading spinner

import type {StorageDestination} from "@/model/database-connection";

export const DASH_STORAGE_VERSION = 1 // increment this if there are breaking changes to the storage format
export const LOADING_TIMER_OFFSET_MS = 150; // how long the query needs to run before showing the loading spinner [ms]

export const STORAGE_THROTTLE_TIME_MS = 1_000; // how long to wait before saving the state again [ms]

export const ENABLE_AUTOLOAD_IN_DEBUG = false
export const DASH_DOMAIN = 'app.dash.builders'
export const DASH_VIDEO_BASE_URL = 'https://qfsxxbgzapt0b2kj.public.blob.vercel-storage.com/videos/canvas'

export const DASH_CATALOG_STATE = 'dash_state' // catalog alias for the per-project state database (cache + relationState)
export const DASH_CATALOG_DATA = 'dash_data' // catalog alias for the per-project data database (user tables + macros)
export const DASH_CATALOG_PROJECTS = 'projects' // catalog alias for the GLOBAL (per-connection) meta database: the projects registry

export const DASH_PROJECTS_DATABASE_NAME = 'projects.duckdb'
export const DASH_PROJECTS_TABLE_NAME = 'projects'

// Id of the always-present seeded project (WASM has no folder to derive a name from). Kept here so
// the storage seam can special-case it without importing the projects state (avoids an import cycle).
export const DEFAULT_PROJECT_ID = 'default';

export const DASH_CACHE_SCHEMA = 'cache'
export const DASH_REFS_SCHEMA = 'refs';

// connection ids
export const DATABASE_CONNECTION_ID_DUCKDB_WASM = 'duckdb-wasm';
export const DATABASE_CONNECTION_ID_DUCKDB_LOCAL = 'duckdb-local';
export const DATABASE_CONNECTION_ID_DUCKDB_NATIVE = 'duckdb-native';
export const SOURCE_CONNECTION_ID_DUCKDB_FILE_SYSTEM = 'filesystem';
export const MAIN_CONNECTION_ID = DATABASE_CONNECTION_ID_DUCKDB_LOCAL;


export const VERSION_CONFLICT_ERROR = 'Version conflict, the data has been modified by another tab or user.'

export const CHART_QUERY_LIMIT = 50_000;
export const SELECT_QUERY_LIMIT = 2_000;

export const DEFAULT_COLORS = [
    "#6366f1",  // Indigo
    "#f43f5e",  // Rose
    "#0ea5e9",  // Sky
    "#f59e0b",  // Amber
    "#10b981",  // Emerald
    "#8b5cf6",  // Violet
    "#ec4899",  // Pink
    "#14b8a6",  // Teal
    "#f97316",  // Orange
    "#06b6d4",  // Cyan
    "#84cc16",  // Lime
    "#e11d48",  // Red
    "#a855f7",  // Purple
    "#22d3ee",  // Light Cyan
    "#facc15",  // Yellow
    "#2dd4bf",  // Light Teal
    "#fb7185",  // Light Rose
    "#818cf8",  // Light Indigo
    "#34d399",  // Light Emerald
    "#fbbf24",  // Light Amber
]

export interface LLMSettings {
    maxMessagesToPrompt: number; // maximum number of messages to prompt the LLM with
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
    maxMessagesToPrompt: 8, // always + 1 if there is a system prompt
}

export const N_RELATIONS_DATA_TO_LOAD = 30;

export const DEFAULT_RELATION_VIEW_PATH =[]

export const DASH_CACHE_TABLE_PREFIX = 'dash-cache-';

export const DEFAULT_STATE_STORAGE_DESTINATION: StorageDestination = {
    tableName: 'relationState',
    schemaName: 'main',
    databaseName: DASH_CATALOG_STATE,
}

export const ERROR_MESSAGE_QUERY_ABORTED = 'Query aborted by user';

export const TABLE_FOOTER_SMALL_WIDTH_THRESHOLD = 512;

// Container-query widths (px) at which ViewPadding steps up its horizontal gutter: tight below
// MEDIUM, medium between MEDIUM and WIDE, wide at/above WIDE. Registered as the `view-medium` /
// `view-wide` container sizes in tailwind.config.ts, which is where the `@view-medium/view:` and
// `@view-wide/view:` utilities in view-padding.tsx get these values — single source of truth.
export const VIEW_PADDING_MEDIUM_BREAKPOINT_PX = 640;
export const VIEW_PADDING_WIDE_BREAKPOINT_PX = 1024;

// minimum distance from node center for relation handles to become active, in pixels
export const WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE = 64;


// SQL editor debounce time for local code changes in milliseconds
export const SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS = 100;

export const DATABASE_STATE_REFRESH_INTERVAL_MS = 30_000;

// If the view query takes longer than this threshold, execute the count query separately.
// For fast queries, the row count from the view query result is used instead.
export const COUNT_QUERY_THRESHOLD_MS = 2_000;

// Table cell string length above which the hover "expand value" button is shown [chars]
export const COLUMN_VALUE_EXPAND_THRESHOLD = 25;