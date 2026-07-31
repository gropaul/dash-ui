// Example imports – adjust to match your local setup
import * as duckdb from '@duckdb/duckdb-wasm';
import {AsyncDuckDB, AsyncDuckDBConnection, DuckDBBundles, DuckDBDataProtocol, LogLevel} from '@duckdb/duckdb-wasm';
import {Coordinator, createConnectionCoordinator} from "@/state/connections/connection-coordinator";
import {getJsonMacro, getOpfsFileHandle, removeOpfsFile} from "@/state/connections/duckdb-wasm/utils";
import {DASH_CATALOG_STATE, DASH_CATALOG_DATA} from "@/platform/global-data";
import {isDebugMode} from "@/components/settings/about-content";
import {getProjectDashStateFileName, getProjectDataFileName} from "@/state/projects.state";

export type StorageMode = 'opfs' | 'memory';
let _storageMode: StorageMode = 'opfs';
export function getStorageMode(): StorageMode { return _storageMode; }

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
        // todo: fix this
        return ''
        // if (_storageMode === 'memory') {
        //     return ':memory:';
        // }
        // return `opfs://${getDashDbFileName()}`;
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

        if (!isOPFSSupported()) {
            throw new Error('OPFS is not supported in this environment. DuckDB-Wasm cannot be initialized.');
        }

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
                console.log('Another tab requested ownership of the DuckDB-Wasm database. Releasing ownership and destroying the current instance.');
                await this.destroy();
                unsubscribe();
            }
        });

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
        try {
            db = await createInstance();
            await db.open({path: ':memory:', query: queryConfig, opfs: {fileHandling: 'manual'}});
            connection = await db.connect();
            console.log("New connection to DuckDB-Wasm established: ", connection);
        } catch (e) {
            try { await db!.terminate(); } catch { /* ignore cleanup errors */ }
            this.coordinator.releaseOwnership();
            console.error("Failed to create or connect to DuckDB-Wasm instance:", e);
            throw e;
        }

        try {
            // check if we have write access
            await connection!.query("CREATE OR REPLACE TABLE dash_write_test_table AS SELECT 1 as a;");
            await connection!.query("DROP TABLE dash_write_test_table;");
        } catch (e) {
            console.error("Failed to verify write access to DuckDB-Wasm instance:", e);
            throw e;
        }

        try {
            const sqlMarco = getJsonMacro();
            await connection!.query(sqlMarco);
        } catch (e) {
            console.error('Failed to create or verify the JSON macro:', e);
            throw e;
        }

        console.log("DuckDB-Wasm instance initialised successfully.");
        return {db: db!, con: connection!};
    }

    /**
     * ATTACH a database file as a named catalog, papering over duckdb-wasm's OPFS quirks.
     *
     * Quirk 1: ATTACH cannot create a fresh OPFS database - a pre-made 0-byte file makes it throw
     *   "not a valid DuckDB database file". Only db.open() formats a new file, so we prime a
     *   missing/empty file with a throwaway instance first.
     * Quirk 2: manual OPFS mode needs the .duckdb file AND its .wal registered before ATTACH.
     *
     * Don't bump the version to dodge this: wasm dev34-58 hide the error but silently drop every
     * write (0-byte files, no persistence); dev60+ persist again but add a .wal.checkpoint file to
     * register. The engine here (1.4.x) persists correctly, so we stay put and prime instead.
     */
    public async attachDatabase(fileName: string, catalog: string): Promise<void> {
        console.log(`Attaching database file ${fileName} as catalog ${catalog}`);
        const {db, con} = await this.getCurrentWasm();
        return this.attachDatabaseInternal(con, db, fileName, catalog);
    }

    private async attachDatabaseInternal(connection: AsyncDuckDBConnection, db: AsyncDuckDB, filePath: string, catalog: string): Promise<void> {
        if (filePath.startsWith('opfs://')) {
            await this.ensureOpfsDatabaseInitialised(filePath);
            await registerDatabaseInOPFS(db, filePath);
        }
        await connection.query(`ATTACH IF NOT EXISTS '${filePath}' AS ${catalog} (READ_WRITE);`);
    }

    /**
     * Make sure a fresh OPFS path holds a valid (empty) DuckDB database before we ATTACH it. If the
     * file is missing or 0 bytes, a throwaway instance opens it as a main db - which is the only path
     * that writes a valid header - then closes. Existing databases are left untouched.
     */
    private async ensureOpfsDatabaseInitialised(path: string): Promise<void> {
        const existing = await getOpfsFileHandle(path, false).catch(() => null);
        if (existing && (await existing.getFile()).size > 0) return;

        const tmp = await this.createUninitialisedInstance();
        try {
            await tmp.open({path, accessMode: duckdb.DuckDBAccessMode.READ_WRITE});
            const con = await tmp.connect();
            await con.query('CHECKPOINT;'); // flush the header to disk
            await con.close();
        } finally {
            await tmp.terminate().catch(() => { /* ignore cleanup errors */ });
        }
    }

    /** A fresh, instantiated (but un-opened) AsyncDuckDB - used for one-off tasks like priming files. */
    private async createUninitialisedInstance(): Promise<AsyncDuckDB> {
        const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
        const worker = await this._createWorker(bundle);
        const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(LogLevel.ERROR), worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        return db;
    }
}


/**
 * Register the OPFS file handles DuckDB needs to ATTACH a database in manual mode: the .duckdb file
 * and its .wal companion. The file must already be a valid database (see ensureOpfsDatabaseInitialised).
 */
async function registerDatabaseInOPFS(db: AsyncDuckDB, path: string) {
    if (!path.startsWith('opfs://')) {
        throw new Error(`registerDatabaseInOPFS: path must start with opfs://: ${path}`);
    }
    for (const p of [path, `${path}.wal`]) {
        const handle = await getOpfsFileHandle(p, true);
        try { await db.dropFile(p); } catch { /* not registered yet */ }
        await db.registerFileHandle(p, handle, DuckDBDataProtocol.BROWSER_FSACCESS, true);
    }
}