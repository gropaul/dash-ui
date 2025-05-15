// Example imports – adjust to match your local setup
import * as duckdb from '@duckdb/duckdb-wasm';
import {AsyncDuckDB, AsyncDuckDBConnection, DuckDBBundles, LogLevel} from '@duckdb/duckdb-wasm';

export const DUCKDB_WASM_BASE_TABLE_PATH = 'browser3.duckdb';


export async function clearOPFS(): Promise<void> {

    await WasmProvider.getInstance().destroy();

    // clear main.duckdb and its wal
    const walPath = `${DUCKDB_WASM_BASE_TABLE_PATH}.wal`;

    const rootHandle = await navigator.storage.getDirectory();
    const dbHandle = await rootHandle.removeEntry(DUCKDB_WASM_BASE_TABLE_PATH);
    const walHandle = await rootHandle.removeEntry(walPath);

}

/**
 * Ensures the environment can use the Origin‑Private File System (OPFS)
 * which DuckDB‑Wasm relies on when the "opfs" bundle is selected.
 *
 * Throws an Error if:
 *  – the code is executed during SSR (nowindow)
 *  – the page is not asecure context (neither HTTPS nor localhost)
 *  – the browser lacks the StorageManager.getDirectory() API
 */
export function assertOPFSSupported(): void {
    /* 1– Next.js pages can run on the server; bail out there. */
    if (typeof window === "undefined") {
        throw new Error(
            "DuckDB‑Wasm with OPFS must be initialised in the browser. " +
            "This code is running on the server (SSR)."
        );
    }

    /* 2– Secure‑context check: HTTPS or localhost/127.0.0.1 */
    const { hostname, protocol } = window.location;
    const isLocalhost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".localhost");



    if (!window.isSecureContext && !isLocalhost && protocol !== "https:") {
        throw new Error(
            "OPFS is only available in secure contexts (HTTPS or localhost). " +
            `Current origin: ${protocol}//${hostname}`
        );
    }

    /* 3– Basic feature‑detection for the OPFS entry‑point. */
    const hasOPFS =
        typeof navigator !== "undefined" &&
        !!navigator.storage &&
        "getDirectory" in navigator.storage;

    if (!hasOPFS) {
        throw new Error(
            "This browser does not implement the Origin‑Private File System API " +
            "(navigator.storage.getDirectory). DuckDB‑Wasm cannot use OPFS here."
        );
    }
}


export type WasmAccessMode = 'TEMPORARY' | 'PERSISTENT_READ' | 'PERSISTENT_WRITE'

export interface WasmConfig {
    db_path: string;
}

export class WasmProvider {
    private static instance: WasmProvider | null = null;

    // Tracks our initialization state
    private asyncDuckDBState: 'uninitialised' | 'initialising' | 'initialised' = 'uninitialised';

    // Will hold the active connection once initialized
    private db: AsyncDuckDB | null = null;
    private con: AsyncDuckDBConnection | null = null;

    // For handling concurrency (so repeated calls to getDuckDBWasm return the same promise while initializing)
    private initPromise: Promise<{ db: AsyncDuckDB, con: AsyncDuckDBConnection }> | null = null;

    private constructor() {
        // Private to enforce singleton usage
    }

    public static getInstance(): WasmProvider {
        if (!WasmProvider.instance) {
            WasmProvider.instance = new WasmProvider();
        }
        return WasmProvider.instance;
    }

    public async destroy(): Promise<void> {
        if (this.con) {
            await this.con.close();
            this.con = null;
        }
        if (this.db) {
            await this.db.dropFile('attached.duckdb');

            await this.db.terminate();

            this.db = null;
        }

        this.asyncDuckDBState = 'uninitialised';
        this.initPromise = null;
    }

    public static getDatabasePath(): string {
        return `opfs://${DUCKDB_WASM_BASE_TABLE_PATH}`;
    }

    public async getCurrentWasm(): Promise<{ db: AsyncDuckDB, con: AsyncDuckDBConnection }> {
        // If already initialized, just return the existing connection
        if (this.asyncDuckDBState === 'initialised' && this.con && this.db) {
            return {db: this.db, con: this.con};
        }

        // If in the process of initializing, return that shared promise
        if (this.asyncDuckDBState === 'initialising' && this.initPromise) {
            return this.initPromise;
        }

        // Otherwise, begin initializing
        this.asyncDuckDBState = 'initialising';

        // Store the initialization promise so subsequent calls reuse it
        this.initPromise = this._initDuckDBWasm()
            .then(result => {
                const {db, con} = result;
                this.con = con;
                this.asyncDuckDBState = 'initialised';
                this.db = db;
                return result;
            })
            .catch(error => {
                // If initialization fails, reset everything so we can try again
                this.asyncDuckDBState = 'uninitialised';
                this.con = null;
                this.initPromise = null;
                throw error;
            });

        return this.initPromise;
    }

    private async _initDuckDBWasm(): Promise<{ db: AsyncDuckDB, con: AsyncDuckDBConnection }> {

        // check if OPFS is supported
        assertOPFSSupported();

        // Grab available bundles
        const bundles: DuckDBBundles = duckdb.getJsDelivrBundles();

        // Automatically pick a bundle compatible with the current browser
        const bundle = await duckdb.selectBundle(bundles);

        // Build a temporary worker script using importScripts
        const workerUrl = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], {type: 'text/javascript'})
        );

        // Create the worker
        const worker = new Worker(workerUrl);

        // (Optional) Provide a console logger
        const IS_DEBUG = process.env.NODE_ENV === 'development';
        const logLevel = IS_DEBUG ? LogLevel.DEBUG : LogLevel.ERROR;
        const logger = new duckdb.ConsoleLogger(logLevel);

        // Create the DuckDB instance
        const db = new duckdb.AsyncDuckDB(logger, worker);

        // Start up the WASM engine
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

        // We no longer need the workerUrl, so revoke it
        URL.revokeObjectURL(workerUrl);

        // Open a DB, adjusting config as necessary
        await db.open({
            path: WasmProvider.getDatabasePath(),
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
            query: {
                castBigIntToDouble: true,
                castTimestampToDate: true,
                castDecimalToDouble: true,
                castDurationToTime64: true,
            },
        });

        // Finally, create a connection
        const connection = await db.connect();
        // await db.registerOPFSFileName('opfs://attached.duckdb');
        // console.log('Registered OPFS file name');
        // // try to attach a second database
        // await connection.query("ATTACH DATABASE 'opfs://attached.duckdb' AS attached;");
        // console.log('Attached database');

        // check if we have write access
        const result = await connection.query("CREATE OR REPLACE TABLE dash_write_test_table AS SELECT 1 as a;");
        // drop the test table
        await connection.query("DROP TABLE dash_write_test_table;");
        return {db, con: connection};
    }
}
