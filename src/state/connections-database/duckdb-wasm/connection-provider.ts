// Example imports – adjust to match your local setup
import * as duckdb from '@duckdb/duckdb-wasm';
import {
    AsyncDuckDB,
    AsyncDuckDBConnection,
    DuckDBBundles
} from '@duckdb/duckdb-wasm';

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

    public async getWasm(): Promise<{ db: AsyncDuckDB, con: AsyncDuckDBConnection }> {
        // If already initialized, just return the existing connection
        if (this.asyncDuckDBState === 'initialised' && this.con && this.db) {
            return { db: this.db, con: this.con };
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
                const { db, con } = result;
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
        // Grab available bundles
        const bundles: DuckDBBundles = duckdb.getJsDelivrBundles();

        // Automatically pick a bundle compatible with the current browser
        const bundle = await duckdb.selectBundle(bundles);

        // Build a temporary worker script using importScripts
        const workerUrl = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
        );

        // Create the worker
        const worker = new Worker(workerUrl);

        // (Optional) Provide a console logger
        const logger = new duckdb.ConsoleLogger();

        // Create the DuckDB instance
        const db = new duckdb.AsyncDuckDB(logger, worker);

        // Start up the WASM engine
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

        // We no longer need the workerUrl, so revoke it
        URL.revokeObjectURL(workerUrl);

        // Open a DB, adjusting config as necessary
        await db.open({
            path: 'opfs://ahegpsb7u8f.duckdb',
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
        console.log('DuckDB WASM successfully initialized and connected!');
        return { db, con: connection };
    }
}
