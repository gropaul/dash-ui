// Example imports – adjust to match your local setup
import * as duckdb from '@duckdb/duckdb-wasm';
import {AsyncDuckDB, AsyncDuckDBConnection, DuckDBBundles, DuckDBDataProtocol, LogLevel} from '@duckdb/duckdb-wasm';
import {Coordinator, createConnectionCoordinator} from "@/state/connections/connection-coordinator";
import {getJsonMacro, getOpfsFileHandle, removeOpfsFile} from "@/state/connections/duckdb-wasm/utils";
import {DASH_CATALOG, DASH_DATA_CATALOG} from "@/platform/global-data";
import {getDashDbFileName, getMainDbFileName} from "@/state/projects/project-storage";
import {isDebugMode} from "@/components/settings/about-content";

export type StorageMode = 'opfs' | 'memory';
let _storageMode: StorageMode = 'opfs';
export function getStorageMode(): StorageMode { return _storageMode; }

export async function clearOPFS(): Promise<void> {
    if (_storageMode === 'memory') {
        await DuckdbWasmProvider.getInstance().destroy();
        return;
    }

    await DuckdbWasmProvider.getInstance().destroy();

    // clear the current project's state database and its wal (path may be nested under <projectId>/)
    const dashFile = getDashDbFileName();
    await removeOpfsFile(dashFile);
    await removeOpfsFile(`${dashFile}.wal`);
}

/**
 * Wipe the ENTIRE OPFS root — every project's data/state databases (and any other files/dirs).
 * Destroys the WASM instance first to release file locks. A dev escape hatch when the store is wedged.
 */
export async function clearAllOPFS(): Promise<void> {
    await DuckdbWasmProvider.getInstance().destroy();

    const root = await navigator.storage.getDirectory();
    // Collect names first, then delete — mutating while iterating the directory is unreliable.
    const names: string[] = [];
    for await (const name of (root as unknown as { keys(): AsyncIterableIterator<string> }).keys()) {
        names.push(name);
    }
    for (const name of names) {
        await root.removeEntry(name, {recursive: true});
    }
    console.log('Cleared all OPFS entries:', names);
}

/**
 * Checks whether the environment can use the Origin‑Private File System (OPFS).
 * Returns false (instead of throwing) when OPFS is unavailable so the caller
 * can fall back to an in‑memory database.
 *
 * Still throws if called during SSR — there is no recovery path on the server.
 */
export function isOPFSSupported(): boolean {
    /* 1– Next.js pages can run on the server; bail out there. */
    if (typeof window === "undefined") {
        throw new Error(
            "DuckDB‑Wasm with OPFS must be initialised in the browser. " +
            "This code is running on the server (SSR)."
        );
    }

    /* 2– Secure‑context check: HTTPS or localhost/127.0.0.1 */
    const {hostname, protocol} = window.location;
    const isLocalhost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".localhost");

    if (!window.isSecureContext && !isLocalhost && protocol !== "https:") {
        console.warn(
            `OPFS unavailable: not a secure context. Origin: ${protocol}//${hostname}`
        );
        return false;
    }

    /* 3– Basic feature‑detection for the OPFS entry‑point. */
    const hasOPFS =
        typeof navigator !== "undefined" &&
        !!navigator.storage &&
        "getDirectory" in navigator.storage;

    if (!hasOPFS) {
        console.warn("OPFS unavailable: navigator.storage.getDirectory not implemented");
        return false;
    }

    return true;
}


export class DuckdbWasmProvider {
    private static instance: DuckdbWasmProvider | null = null;

    // Tracks our initialization state
    private asyncDuckDBState: 'uninitialised' | 'initialising' | 'initialised' = 'uninitialised';

    // Will hold the active connection once initialized
    private db: AsyncDuckDB | null = null;
    private con: AsyncDuckDBConnection | null = null;

    // For handling concurrency (so repeated calls to getDuckDBWasm return the same promise while initializing)
    private initPromise: Promise<{ db: AsyncDuckDB, con: AsyncDuckDBConnection }> | null = null;
    private coordinator: Coordinator;

    private constructor() {
        if (typeof window === "undefined") {
            throw new Error("WasmProvider must be created in the browser (not during SSR)");
        }
        this.coordinator = createConnectionCoordinator('duckdb-wasm', true);
    }

    public static getInstance(): DuckdbWasmProvider {
        if (!DuckdbWasmProvider.instance) {
            DuckdbWasmProvider.instance = new DuckdbWasmProvider();
        }
        return DuckdbWasmProvider.instance;
    }

    public async destroy(): Promise<void> {
        if (this.con) {
            await this.con.close();
            this.con = null;
        }
        if (this.db) {
            await this.db.terminate();
            this.db = null;
        }

        this.asyncDuckDBState = 'uninitialised';
        this.initPromise = null;
        console.log('DuckDB-Wasm instance destroyed.');
        this.coordinator.releaseOwnership();
    }

    public static getDatabasePath(): string {
        if (_storageMode === 'memory') {
            return ':memory:';
        }
        return `opfs://${getDashDbFileName()}`;
    }

    public async getCurrentWasm(): Promise<{ db: AsyncDuckDB, con: AsyncDuckDBConnection }> {
        // If already initialized, just return the existing connection
        if (this.asyncDuckDBState === 'initialised' && this.con && this.db) {
            // console.log("Returning existing DuckDB-Wasm instance: ", this.con);
            return {db: this.db, con: this.con};
        }
        // If in the process of initializing, return that shared promise
        if (this.asyncDuckDBState === 'initialising' && this.initPromise) {
            // console.log("Returning pending DuckDB-Wasm initialization promise");
            return this.initPromise;
        }

        console.log("No existing DuckDB-Wasm instance, starting initialization");

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

    private async _createWorker(bundle: duckdb.DuckDBBundle): Promise<Worker> {
        if (!bundle.mainWorker) {
            throw new Error('No worker URL in DuckDB bundle');
        }

        try {
            // Standard approach: Blob URL with importScripts
            const workerUrl = URL.createObjectURL(
                new Blob([`importScripts("${bundle.mainWorker}");`], {type: 'text/javascript'})
            );
            const worker = new Worker(workerUrl);
            URL.revokeObjectURL(workerUrl);
            return worker;
        } catch (e) {
            // Fallback for mobile Safari: importScripts inside Blob workers can fail
            // due to opaque origin restrictions. Fetch the script and inline it.
            console.warn('Blob+importScripts worker failed, fetching worker script directly', e);
            const response = await fetch(bundle.mainWorker);
            const scriptText = await response.text();
            const workerUrl = URL.createObjectURL(
                new Blob([scriptText], {type: 'text/javascript'})
            );
            const worker = new Worker(workerUrl);
            URL.revokeObjectURL(workerUrl);
            return worker;
        }
    }

    private async _initDuckDBWasm(): Promise<{ db: AsyncDuckDB, con: AsyncDuckDBConnection }> {

        let useOPFS = isOPFSSupported();

        // Multi-tab coordination is only needed for OPFS (exclusive file locks)
        if (useOPFS) {
            if (!(await this.coordinator.requestOwnership())) {
                this.coordinator.noteServerConflict('Another tab is using the database');

                await this.coordinator.waitForRelease();
                if (!(await this.coordinator.requestOwnership())) {
                    console.error('Failed to acquire ownership of the DuckDB-Wasm database after waiting for release.');
                } else {
                    console.log('Acquired ownership of the DuckDB-Wasm database after waiting for release.');
                }
            }

            // Register a handler to release ownership when asked for it
            const unsubscribe = this.coordinator.subscribe(async (isOwner) => {
                if (!isOwner && this.asyncDuckDBState === 'initialised') {
                    await this.destroy();
                    unsubscribe();
                }
            });
        }

        // Grab available bundles
        const bundles: DuckDBBundles = duckdb.getJsDelivrBundles();

        // Automatically pick a bundle compatible with the current browser
        const bundle = await duckdb.selectBundle(bundles);

        const queryConfig = {
            castBigIntToDouble: true,
            castTimestampToDate: true,
            castDecimalToDouble: true,
            castDurationToTime64: true,
        };

        // (Optional) Provide a console logger
        const IS_DEBUG = isDebugMode();
        const logLevel = IS_DEBUG ? LogLevel.ERROR : LogLevel.ERROR;
        const logger = new duckdb.ConsoleLogger(logLevel);

        // Helper to create and instantiate a DuckDB instance
        const createInstance = async (): Promise<AsyncDuckDB> => {
            const worker = await this._createWorker(bundle);
            const db = new duckdb.AsyncDuckDB(logger, worker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            return db;
        };

        let db: AsyncDuckDB;
        let connection: AsyncDuckDBConnection;

        // The default catalog is a throwaway `:memory:` database ("memory") that we never swap; the
        // per-project data + state databases are ATTACHed as named catalogs and USE'd. This lets a
        // project switch just DETACH/ATTACH those catalogs instead of tearing down the whole instance.
        if (useOPFS) {
            try {
                db = await createInstance();
                await db.open({path: ':memory:', query: queryConfig});
                connection = await db.connect();
                console.log("New connection to DuckDB-Wasm established (OPFS): ", connection);

                await this.attachProjectDatabases(connection, db, true);

                _storageMode = 'opfs';
            } catch (e) {
                console.warn('OPFS initialization failed, falling back to in-memory mode:', e);
                // Clean up the failed OPFS attempt
                try { await db!.terminate(); } catch { /* ignore cleanup errors */ }
                this.coordinator.releaseOwnership();
                useOPFS = false;
            }
        }

        if (!useOPFS) {
            _storageMode = 'memory';
            console.log('Initializing DuckDB-Wasm in in-memory mode (no persistence)');

            db = await createInstance();
            await db.open({path: ':memory:', query: queryConfig});
            connection = await db.connect();
            console.log("New connection to DuckDB-Wasm established (in-memory): ", connection);

            await this.attachProjectDatabases(connection, db, false);
        }

        // check if we have write access
        await connection!.query("CREATE OR REPLACE TABLE dash_write_test_table AS SELECT 1 as a;");
        // drop the test table
        await connection!.query("DROP TABLE dash_write_test_table;");

        try {
            const sqlMarco = getJsonMacro();
            const data = await connection!.query(sqlMarco);
        } catch (e) {
            console.error('Failed to create or verify the JSON macro:', e);
            throw e;
        }
        return {db: db!, con: connection!};
    }

    /**
     * ATTACH the current project's data + state databases as named catalogs and USE the data catalog
     * (so unqualified user tables land in the per-project data file). Shared by init and re-attach.
     */
    private async attachProjectDatabases(connection: AsyncDuckDBConnection, db: AsyncDuckDB, useOpfs: boolean): Promise<void> {
        if (useOpfs) {
            const mainFile = getMainDbFileName();
            const dashFile = getDashDbFileName();
            await registerAdditionalDatabase(db, mainFile);
            await registerAdditionalDatabase(db, dashFile);
            await connection.query(`ATTACH IF NOT EXISTS 'opfs://${mainFile}' AS ${DASH_DATA_CATALOG};`);
            await connection.query(`ATTACH IF NOT EXISTS 'opfs://${dashFile}' AS ${DASH_CATALOG};`);
        } else {
            await connection.query(`ATTACH IF NOT EXISTS ':memory:' AS ${DASH_DATA_CATALOG};`);
            await connection.query(`ATTACH IF NOT EXISTS ':memory:' AS ${DASH_CATALOG};`);
        }
        await connection.query(`USE ${DASH_DATA_CATALOG};`);
    }

    /**
     * Swap the attached data + state databases to the current project's files (read via the storage
     * seam) WITHOUT tearing down the instance — the project-switch equivalent of a reconnect. Detaches
     * the old catalogs (after moving off them) and re-attaches the new ones. The `memory` default
     * catalog and the TEMP `query_result_json` macro are untouched, so queries keep working.
     */
    public async reattachProjectDatabases(): Promise<void> {
        const {db, con} = await this.getCurrentWasm();
        const useOpfs = _storageMode === 'opfs';
        // Can't detach the current catalog — park on the throwaway `memory` default first.
        await con.query(`USE memory;`);
        for (const cat of [DASH_DATA_CATALOG, DASH_CATALOG]) {
            try {
                await con.query(`DETACH DATABASE ${cat};`);
            } catch (e) {
                console.warn(`DETACH ${cat} failed (may not be attached):`, e);
            }
        }
        await this.attachProjectDatabases(con, db, useOpfs);
    }
}


async function registerAdditionalDatabase(db: AsyncDuckDB, name: string) {
    const wal_name = name + '.wal';
    // Get/create file handles
    const fileHandle = await getOpfsFileHandle(name, true);
    const fileHandleWal = await getOpfsFileHandle(wal_name, true);
    // Drop any prior registration under these names first — on a project switch-back we re-register a
    // name that's still registered from before, and registerFileHandle throws on a duplicate.
    try { await db.dropFile('opfs://' + name); } catch { /* not registered yet */ }
    try { await db.dropFile('opfs://' + wal_name); } catch { /* not registered yet */ }
    await db.registerFileHandle('opfs://' + name, fileHandle, DuckDBDataProtocol.BROWSER_FSACCESS, true);
    await db.registerFileHandle('opfs://' + wal_name, fileHandleWal, DuckDBDataProtocol.BROWSER_FSACCESS, true);

}
