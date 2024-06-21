'use client';

import {FileDrop} from "./file-drop";
import React, {useContext} from "react";
import {DuckDBConnectionContext, DuckDBContext} from "./duck-db-provider";
import * as duckdb from '@duckdb/duckdb-wasm';
import {DuckDBDataProtocol} from '@duckdb/duckdb-wasm';

interface Props {

}

interface State {
    rowCount: number;
    executionDuration: number;
}

export const useDuckDBConnection = () => useContext(DuckDBConnectionContext);
export const useDuckDB = () => useContext(DuckDBContext);

export async function onDropFiles(connection: duckdb.AsyncDuckDBConnection, db: duckdb.AsyncDuckDB, files: File[]): Promise<State> {
    // get the first file
    // read the file

    const pickedFile: File = files[0];
    await db.registerFileHandle('local.csv', pickedFile, DuckDBDataProtocol.BROWSER_FILEREADER, true);

    const createTableQuery = `CREATE TABLE t1 AS FROM read_csv('local.csv', AUTO_DETECT=TRUE);`;
    await connection.query(createTableQuery);

    const query = `SELECT COUNT(*) as count FROM t1`;

    const start = Date.now();
    const arrowResult= await connection.query(query);
    // Convert arrow table to json
    const result = arrowResult.toArray().map((row: any) => row.toJSON());
    console.log(result);
    // get first value of first row
    const firstRow = result[0];
    const rowCount = firstRow.count;
    // print type of first value
    console.log(typeof rowCount);
    console.log(rowCount);
    console.log(firstRow);
    console.log(Object.keys(firstRow));
    const duration = Date.now() - start;


    return {rowCount, executionDuration: duration};


}

export function Table(props: Props) {

    const connection = useDuckDBConnection();
    const db = useDuckDB();
    // state
    const [state, setState] = React.useState<State>({rowCount: 0, executionDuration: 0});

    return <div>
        <FileDrop
            onDrop={(files) => {
                console.log("Files dropped", files);
                onDropFiles(connection!, db!, files).then((newState) => {
                    setState(newState);
                });
            }}
        />

        <div>
            <h1>Table</h1>
            <p>Row count: {state.rowCount.toString()}</p>
            <p>Execution duration: {state.executionDuration}</p>
        </div>

    </div>;
}