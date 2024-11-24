'use client';

import {FileDrop} from "@/components/basics/input/file-drop";
import React from "react";
import {useRelationsState} from "@/state/relations.state";
import {useConnectionsState} from "@/state/connections.state";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {DUCKDB_IN_MEMORY_DB, DUCKDB_BASE_SCHEMA} from "@/platform/global-data";

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
    const showRelation = useRelationsState((state) => state.showRelationByName);
    const updateDataSources = useConnectionsState((state) => state.updateDataSources);

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
                    await showRelation(duckDBWasm.id, DUCKDB_IN_MEMORY_DB, DUCKDB_BASE_SCHEMA, relation_name);
                }
                updateDataSources(duckDBWasm.id);
            });
        }}
        onOverUpdate={(isOver, files) => {
        }}
    >

        {props.children}
    </FileDrop>
}