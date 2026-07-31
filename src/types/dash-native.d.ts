// Shape of the bridge exposed by electron/preload.cjs as `window.dashNative`.
// Present only in the Electron renderer; `undefined` in the browser (used to detect Electron).

export interface DashNativeApi {
    /** Runs an already-escaped query through the query_result_json macro; resolves to a JSON string. */
    query: (escapedQuery: string) => Promise<string>;
    /** Runs a raw query, bypassing the JSON macro; resolves to rows as array-of-arrays. */
    queryRaw: (query: string) => Promise<unknown[][]>;
    /** Interrupts the currently running query. */
    interrupt: () => Promise<boolean>;
    /** Storage root (home/.duckdb/extension_data/dash/) for per-project state DBs. */
    storageRoot: () => Promise<string>;
}

declare global {
    interface Window {
        dashNative?: DashNativeApi;
    }
}
