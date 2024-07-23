'use client';

import {FileDrop} from "./base/input/file-drop";
import React, {useContext} from "react";
import {DuckDBConnectionContext, DuckDBContext} from "./utils/duck-db-provider";
import * as duckdb from '@duckdb/duckdb-wasm';
import {DuckDBDataProtocol} from '@duckdb/duckdb-wasm';
import {Relation} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";

interface Props {

}

interface State {
    executionDuration: number;
    relation?: Relation
}

export const useDuckDBConnection = () => useContext(DuckDBConnectionContext);
export const useDuckDB = () => useContext(DuckDBContext);

export function transferDuckDBJson(name: string, json: any): Relation {
    const firstRow = json[0];
    const columns = Object.keys(firstRow);

    const rows = json.map((jsonRow: any) => {
        // the row is the list of values of the json map
        return columns.map((column) => jsonRow[column]);
    });

    return {
        name: name,
        columns: columns.map((column) => {
            return {
                name: column,
                type: 'String'
            }
        }),
        rows
    };
}

export async function onDropFiles(connection: duckdb.AsyncDuckDBConnection, db: duckdb.AsyncDuckDB, files: File[]): Promise<State> {
    // get the first file
    // read the file

    const pickedFile: File = files[0];
    const fileName = pickedFile.name;
    await db.registerFileHandle(fileName, pickedFile, DuckDBDataProtocol.BROWSER_FILEREADER, true);
    const tableName = fileName.split('.')[0];
    const createTableQuery = `CREATE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}', AUTO_DETECT=TRUE);`;
    await connection.query(createTableQuery);

    const query = `SELECT * FROM ${tableName} LIMIT 50;`;

    const start = Date.now();
    const arrowResult = await connection.query(query);
    // Convert arrow table to json
    const result = arrowResult.toArray().map((row: any) => row.toJSON());

    const duration = Date.now() - start;

    const relation = transferDuckDBJson(fileName, result);

    return {executionDuration: duration, relation};
}

export function Tmp(props: Props) {

    const connection = useDuckDBConnection();

    const db = useDuckDB();
    // state
    const [state, setState] = React.useState<State>({executionDuration: 0});

    const addRelation = useRelationsState((state) => state.addRelation);

    return <div>
        <FileDrop
            onDrop={(files) => {
                console.log("Files dropped", files);
                onDropFiles(connection!, db!, files).then((newState) => {
                    setState(newState);
                    if (newState.relation) {
                        addRelation(newState.relation);
                    }
                });
            }}
        />

    </div>;
}