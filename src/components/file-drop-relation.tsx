'use client';

import {FileDrop} from "@/components/basics/input/file-drop";
import React from "react";
import {useRelationsState} from "@/state/relations.state";
import {useConnectionsState} from "@/state/connections.state";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {DUCK_DB_IN_MEMORY_DB} from "@/state/connections/duckdb-helper";

interface Props {
    className?: string;
    children?: React.ReactNode;
}

interface State {
    fileIsHovered: boolean;
    hoveredFiles?: File[];
}

export async function onDropFiles(duckDBWasm: DuckDBWasm, files: File[]): Promise<string[]> {
    // get the first file
    // read the file
    const relation_names = [];
    for (const file of files) {
        const relation_name = await duckDBWasm.createTableFromBrowserFileHandler(file);
        relation_names.push(relation_name);
    }
    return relation_names;
}

export function FileDropRelation(props: Props) {

    const getDuckDBWasm = useConnectionsState((state) => state.getDuckDBWasmConnection);
    const showRelation = useRelationsState((state) => state.showRelation);
    const updateDataSources = useConnectionsState((state) => state.updateDataSources);

    // state
    const [state, setState] = React.useState<State>({fileIsHovered: false});

    return <FileDrop
        className={props.className}
        onDrop={(files) => {
            const duckDBWasm = getDuckDBWasm();
            if (!duckDBWasm) {
                console.error('DuckDB WASM connection not found');
                throw new Error('DuckDB WASM connection not found');
            }
            onDropFiles(duckDBWasm, files).then(async (relation_names) => {
                for (const relation_name of relation_names) {
                    await showRelation(duckDBWasm.id, DUCK_DB_IN_MEMORY_DB, relation_name);
                }
                updateDataSources(duckDBWasm.id);
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
            <div
                className="text-s text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 m-auto p-4 rounded-lg">
                <b>Drop files here</b>
            </div>
        </div> : null}
    </FileDrop>
}