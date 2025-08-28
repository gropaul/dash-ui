// Example imports – adjust to match your local setup
import * as duckdb from '@duckdb/duckdb-wasm';
import {AsyncDuckDB, AsyncDuckDBConnection, DuckDBBundles, LogLevel} from '@duckdb/duckdb-wasm';
import {Coordinator, createConnectionCoordinator} from "@/state/connections/connection-coordinator";
import {getAsyncDuckDb, MDConnection, SpecialDuckDBValue} from "@motherduck/wasm-client";


export interface MdWasmConfig {
    token: string;
}

export class MdWasmProvider {
    private static instance: MdWasmProvider | null = null;

    // Tracks our initialization state
    private asyncDuckDBState: 'uninitialised' | 'initialising' | 'initialised' = 'uninitialised';

    // Will hold the active connection once initialized
    private con: MDConnection | null = null;

    // For handling concurrency (so repeated calls to getDuckDBWasm return the same promise while initializing)
    private initPromise: Promise<{ con: MDConnection }> | null = null;

    private config: MdWasmConfig | null = null;

    private constructor() {
        if (typeof window === "undefined") {
            throw new Error("WasmProvider must be created in the browser (not during SSR)");
        }
    }

    public static getInstance(): MdWasmProvider {
        if (!MdWasmProvider.instance) {
            MdWasmProvider.instance = new MdWasmProvider();
        }
        return MdWasmProvider.instance;
    }

    public async destroy(): Promise<void> {
        if (this.con) {
            await this.con.close();
            this.con = null;
        }

        this.asyncDuckDBState = 'uninitialised';
        this.initPromise = null;
        console.log('Md-Wasm instance destroyed.');
    }

    public async setConfig(config: MdWasmConfig): Promise<void> {
        this.config = config;
        // If already initialized, destroy the existing instance
        if (this.asyncDuckDBState === 'initialised') {
            await this.destroy();
        }
        // Re-initialize with the new config
        await this.getCurrentWasm();
    }

    public async getCurrentWasm(): Promise<{ con: MDConnection }> {
        // If already initialized, just return the existing connection
        if (this.asyncDuckDBState === 'initialised' && this.con) {
            return {con: this.con};
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
                const {con} = result;
                this.con = con;
                this.asyncDuckDBState = 'initialised';
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

    private async _initDuckDBWasm(): Promise<{ con: MDConnection }> {

        console.log('Initializing MdWasmProvider...');
        // Ensure config is set
        if (!this.config) {
            throw new Error("MdWasmProvider not configured. Please call setConfig with a valid config.");
        }

        const mdConnection = MDConnection.create({
            mdToken: this.config.token
        });

        // await db.registerOPFSFileName('opfs://attached.duckdb');
        // check if we have write access
        await mdConnection.evaluateQuery("CREATE OR REPLACE TABLE dash_write_test_table AS SELECT 1 as a;");
        // drop the test table
        await mdConnection.evaluateQuery("DROP TABLE dash_write_test_table;");

        const res = await mdConnection.evaluateQuery("SELECT range, range*2, {test: 'test'}, [1,2,3] FROM range(10)");
        return { con: mdConnection};
    }
}
