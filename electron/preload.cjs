// Preload bridge for the native DuckDB connection.
//
// CommonJS is required: sandboxed preloads cannot use ESM. This runs in an isolated
// world and exposes a minimal, serializable API to the renderer as `window.dashNative`.
// The renderer detects Electron via `window.dashNative !== undefined`.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashNative', {
    // escapedQuery: SQL already escaped for a string literal. Returns the JSON string
    // produced by the query_result_json macro (same contract as DuckDB WASM).
    query: (escapedQuery) => ipcRenderer.invoke('duckdb:query', escapedQuery),
    // Raw query bypassing the JSON macro; returns rows as array-of-arrays.
    queryRaw: (query) => ipcRenderer.invoke('duckdb:query-raw', query),
    interrupt: () => ipcRenderer.invoke('duckdb:interrupt'),
    // Storage root (home/.duckdb/extension_data/dash/) for per-project state DBs.
    storageRoot: () => ipcRenderer.invoke('duckdb:storage-root'),
});
