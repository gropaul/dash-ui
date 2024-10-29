'use client';

import React, {createContext} from "react";
import * as duckdb from '@duckdb/duckdb-wasm';
import {AsyncDuckDBConnection} from "@duckdb/duckdb-wasm";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: 'duckdb-mvp.wasm',
        mainWorker: 'duckdb/duckdb-browser-mvp.worker.js',
    },
    eh: {
        mainModule: 'duckdb-eh.wasm',
        mainWorker: 'duckdb/duckdb-browser-eh.worker.js',
    },
};

export const DuckDBContext = React.createContext<duckdb.AsyncDuckDB | null>(null);
export const DuckDBConnectionContext = createContext<AsyncDuckDBConnection | null>(null);


async function staticDuckDBBundles(): Promise<{
    db: duckdb.AsyncDuckDB,
    connection: AsyncDuckDBConnection
}> {

    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    console.log("DuckDB instance created");

    const connection = await db.connect();
    console.log("DuckDB connection created");

    // const path = "http://localhost:3333/web-edge.csv";
    // test whether we can load the csv due to CORS
    // const test = await fetch(path);
    // console.log("CSV fetch result", test);

    // // time the query execution
    // const start = Date.now();
    // // run test query
    // const query = "SELECT COUNT(*) FROM read_csv('http://localhost:3333/web-edge.csv', AUTO_DETECT=TRUE);";
    // const result = await connection.query(query);

    // const duration = Date.now() - start;
    // console.log("Query duration", duration);
    // console.log("Query result", result);

    return {db, connection};


}

interface DuckDBProviderProps {
    children: React.ReactElement | React.ReactElement[];
}

export default function DuckDbProvider({children}: DuckDBProviderProps) {
    const [db, set] = React.useState<duckdb.AsyncDuckDB | null>(null);
    const [connection, setConnection] = React.useState<AsyncDuckDBConnection | null>(null);

    React.useEffect(() => {
        staticDuckDBBundles().then(({connection,db}) => {
            set(db);
            setConnection(connection);
        });
    }, []);

    if (!db) {
        return <div className="text-center w-full h-64 flex justify-center items-center">
            <div>Loading ...</div>
        </div>;
    }

    return (
        <>
            <DuckDBConnectionContext.Provider value={connection}>
                <DuckDBContext.Provider value={db}>
                    {children}
                </DuckDBContext.Provider>
            </DuckDBConnectionContext.Provider>
        </>
    );
}