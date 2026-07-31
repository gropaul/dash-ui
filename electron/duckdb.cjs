// Native DuckDB for the Electron main process, via @duckdb/node-api ("neo").
//
// This is the main-process half of the `duckdb-native` connection. It hosts a real
// DuckDB instance (native extensions, real filesystem) and bridges it to the renderer
// over IPC. The renderer reuses the exact same JSON-materialization path as DuckDB WASM:
// queries are wrapped in `FROM query_result_json('<escaped query>')`, DuckDB itself
// builds the {rows, columns, stats} object, and a single JSON string crosses IPC.
//
// CommonJS on purpose: this is required from an ESM main.js, and @duckdb/node-api is CJS.

const os = require('node:os');
const path = require('node:path');
const { app, ipcMain } = require('electron');
const { DuckDBInstance } = require('@duckdb/node-api');

// Shared with the DuckDB WASM path (getJsonMacro) so native and WASM results stay identical.
const JSON_MACRO_SQL = require('./query-result-json-macro.cjs');

// Mirror of the dash extension's GetDashDirectory() (DuckDB side):
//   home_dir/.duckdb/extension_data/dash
// This is the storage root the duckdb-over-http connection discovers via /api/dash-dir;
// native computes it directly so per-project attach (`${root}${projectId}_dash_state.duckdb`)
// behaves identically to the http path. Returned WITH a trailing separator, per the
// DatabaseConnection.getStorageRoot() contract.
function getDashDirectory() {
    const homeDir = os.homedir();
    if (!homeDir) return '';
    const dashDir = path.join(homeDir, '.duckdb', 'extension_data', 'dash');
    return dashDir + path.sep;
}

let connection = null;
let initPromise = null;

async function connect() {
    const instance = await DuckDBInstance.create();
    const con = await instance.connect();
    await con.run(JSON_MACRO_SQL);
    console.log('[duckdb-native] connected to native DuckDB instance');
    return con;
}

// Registers the IPC surface consumed by electron/preload.cjs. Idempotent.
function initDuckDB() {
    if (initPromise) return initPromise;

    initPromise = connect().then((con) => {
        connection = con;
    });

    // The renderer sends an already-escaped query; we only wrap it in the JSON macro.
    // Returns the single JSON-string cell (cheap to structured-clone across IPC).
    ipcMain.handle('duckdb:query', async (_e, escapedQuery) => {
        await initPromise;
        const reader = await connection.runAndReadAll(
            `FROM query_result_json('${escapedQuery}')`);
        return reader.getRows()[0][0];
    });

    // Side-effecting statements (CREATE, ATTACH, USE, …) that must not go through the JSON
    // macro. Returns raw rows; callers ignore them.
    ipcMain.handle('duckdb:query-raw', async (_e, query) => {
        await initPromise;
        const reader = await connection.runAndReadAll(query);
        return reader.getRows();
    });

    ipcMain.handle('duckdb:interrupt', async () => {
        await initPromise;
        connection.interrupt();
        return true;
    });

    // Storage root for per-project state DBs; mirrors http's getStorageRoot().
    ipcMain.handle('duckdb:storage-root', () => getDashDirectory());

    return initPromise;
}

module.exports = { initDuckDB };
