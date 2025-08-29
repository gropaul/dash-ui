import {RelationData} from "@/model/relation";
import {Column} from "@/model/data-source-connection";
import {duckDBTypeToValueType} from "@/model/value-type";
import {MaterializedQueryResult, MDConnection, SpecialDuckDBValue} from "@motherduck/wasm-client";


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
            console.log('Md-Wasm instance destroyed.');
            this.con = null;
        } else {
            console.log('No Md-Wasm instance to destroy.');
        }

        this.asyncDuckDBState = 'uninitialised';
        this.initPromise = null;
    }

    public async setConfig(config: MdWasmConfig): Promise<void> {
        console.log('Setting MdWasmProvider config: ', config);
        this.config = config;
        // If already initialized, destroy the existing instance
        if (this.asyncDuckDBState === 'initialised') {
            await this.destroy();
        }
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
        this.initPromise = this._initMdWasm()
            .then(result => {
                console.log('MdWasmProvider initialized successfully.');
                const {con} = result;
                this.con = con;
                this.asyncDuckDBState = 'initialised';
                return result;
            })
            .catch(error => {
                // If initialization fails, reset everything so we can try again
                console.error('Failed to initialize MdWasmProvider: ', error);
                this.asyncDuckDBState = 'uninitialised';
                this.con = null;
                this.initPromise = null;
                throw error;
            });

        return this.initPromise;
    }

    private async _initMdWasm(): Promise<{ con: MDConnection }> {

        console.log('Initializing MdWasmProvider: ', this.config);
        // Ensure config is set
        if (!this.config) {
            throw new Error("MdWasmProvider not configured. Please call setConfig with a valid config.");
        }

        // check crossOriginIsolated
        if (!('crossOriginIsolated' in window) || !window.crossOriginIsolated) {
            console.warn('Warning: The application is not running in a cross-origin isolated context. ' +
                'This may lead to performance issues or failures when using certain features like SharedArrayBuffer. ' +
                'For the best experience, consider enabling cross-origin isolation by setting appropriate headers ' +
                '(e.g., Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy) on your server.');
        }

        const token = this.config.token;

        try {
            const fakeToken = 'invalid'
            const testConnection = MDConnection.create({
                mdToken: fakeToken
            });

            const isInitialized = await testConnection.isInitialized();
            console.log('Fake Token Initialized: ', isInitialized);
            const versionResult = await testConnection.evaluateQuery("select version();");
            const version = versionResult.data.singleValue();
            console.log('Fake Token Motherduck version: ', version);
        } catch (e) {
            console.log('Fake token failed as expected. Error: ', (e as Error).message);
        }

        try {
            // get from env var
            const actualToken = process.env.NEXT_PUBLIC_MD_API_KEY;
            if (!actualToken) {
                throw new Error('No Motherduck token provided in NEXT_PUBLIC_MD_API_KEY');
            }
            const testConnection = MDConnection.create({
                mdToken: actualToken
            });
            const isInitalized = await testConnection.isInitialized();
            console.log('Real Token Initialized: ', isInitalized);
            const versionResult = await testConnection.evaluateQuery("select version();");
            const version = versionResult.data.singleValue();
            console.log('Real Token Motherduck version: ', version);
        } catch (e) {
            console.log('Real token failed. Error: ', (e as Error).message);
        }


        throw new Error('Not implemented yet');



        // const mdConnection = MDConnection.create({
        //     mdToken: token
        // });
        //
        //
        // // check if we have write access
        // await mdConnection.evaluateQuery("CREATE OR REPLACE TABLE dash_write_test_table AS SELECT 1 as a;");
        // // drop the test table
        // await mdConnection.evaluateQuery("DROP TABLE dash_write_test_table;");
        //
        // return { con: mdConnection};
    }
}




export function resultToRelationData(result: MaterializedQueryResult): RelationData {
    const duckDBRows = result.data.toRows();

    const rows = []
    for (const ddBRow of duckDBRows) {
        const rowJS: any[] = []
        for (const col of result.data.columnNames()) {
            let val = ddBRow[col];
            if (val instanceof SpecialDuckDBValue) {
                val = val.toJS();
            }
            rowJS.push(val);
        }
        rows.push(rowJS);
    }

    const columns: Column[] = []
    const numCols = result.data.columnCount
    for (let colIndex = 0; colIndex < numCols; colIndex++) {
        const colName = result.data.columnName(colIndex);
        const colType = duckDBTypeToValueType(result.data.columnType(colIndex).name);
        columns.push({
            name: colName,
            id: colName,
            type: colType
        });
    }

    return {
        columns: columns,
        rows: rows
    }

}