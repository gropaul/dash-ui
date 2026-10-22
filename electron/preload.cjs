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
    // ACP agent processes (electron/agents.cjs). Bytes pass through unparsed.
    agent: {
        list: () => ipcRenderer.invoke('agent:list'),
        start: (agentId) => ipcRenderer.invoke('agent:start', agentId),
        write: (channelId, chunk) => ipcRenderer.send('agent:write', channelId, chunk),
        close: (channelId) => ipcRenderer.send('agent:close', channelId),
        // Returns an unsubscribe function.
        onData: (channelId, callback) => {
            const listener = (_event, id, chunk) => { if (id === channelId) callback(chunk); };
            ipcRenderer.on('agent:data', listener);
            return () => ipcRenderer.removeListener('agent:data', listener);
        },
        onExit: (channelId, callback) => {
            const listener = (_event, id, code) => { if (id === channelId) callback(code); };
            ipcRenderer.on('agent:exit', listener);
            return () => ipcRenderer.removeListener('agent:exit', listener);
        },
    },
});
