'use client';

import {FileDrop} from "./base/input/file-drop";
import React, {useContext} from "react";
import {DuckDBConnectionContext, DuckDBContext} from "./utils/duck-db-provider";
import * as duckdb from '@duckdb/duckdb-wasm';
import {DuckDBDataProtocol} from '@duckdb/duckdb-wasm';
import {Relation} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";

interface Props {
    children?: React.ReactNode;
}

interface State {
    fileIsHovered: boolean;
    hoveredFiles?: File[];
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

export async function onDropFiles(connection: duckdb.AsyncDuckDBConnection, db: duckdb.AsyncDuckDB, files: File[]): Promise<Relation[]> {
    // get the first file
    // read the file

    const relations = [];
    for (const file of files) {
        const fileName = file.name;
        await db.registerFileHandle(fileName, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
        const tableName = fileName.split('.')[0];
        const createTableQuery = `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv('${fileName}', AUTO_DETECT=TRUE);`;
        await connection.query(createTableQuery);

        const query = `SELECT * FROM "${tableName}" LIMIT 50;`;
        const arrowResult = await connection.query(query);

        // Convert arrow table to json
        const result = arrowResult.toArray().map((row: any) => row.toJSON());
        const relation = transferDuckDBJson(fileName, result);

        relations.push(relation);

    }
    return relations;
}

export function FileDropRelation(props: Props) {

    const connection = useDuckDBConnection();

    const db = useDuckDB();
    // state
    const [state, setState] = React.useState<State>({fileIsHovered: false});

    const addRelations = useRelationsState((state) => state.addRelations);

    return <div>
        <FileDrop
            onDrop={(files) => {
                onDropFiles(connection!, db!, files).then((newState) => {
                    addRelations(newState);
                });
            }}
            onOverUpdate={(isOver, files) => {
                setState({
                    fileIsHovered: isOver, hoveredFiles: files
                });
            }}
        >

            {props.children}
            {state.fileIsHovered ? <div
                className="pointer-events-none absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 flex">
                <div className="text-s text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 m-auto p-4 rounded-lg">
                    <b>Drop files here</b>
                </div>
            </div> : null}
        </FileDrop>
    </div>;
}