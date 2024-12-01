'use client';

import {FileDrop} from "@/components/basics/input/file-drop";
import React from "react";
import {useRelationsState} from "@/state/relations.state";
import {useConnectionsState} from "@/state/connections.state";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {DUCKDB_BASE_SCHEMA, DUCKDB_IN_MEMORY_DB} from "@/platform/global-data";
import {RelationSource} from "@/model/relation";
import {importAndShowRelationsWithWASM} from "@/state/connections/duckdb-wasm/utils";

interface Props {
    className?: string;
    children?: React.ReactNode;
}

interface State {
    fileIsHovered: boolean;
    hoveredFiles?: File[];
}

export function FileDropRelation(props: Props) {

    const [fileIsHovered, setFileIsHovered] = React.useState(false);

    async function onDrop(files: File[]) {
        await importAndShowRelationsWithWASM(files);
    }

    return <FileDrop
        className={props.className}
        onDrop={onDrop}
        onOverUpdate={(isOver, files) => {
            setFileIsHovered(isOver);
        }}>
        {props.children}
        {fileIsHovered && <FileHover/>}

    </FileDrop>
}

function FileHover() {

    // make all mouse events not work
    return <div
        className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center z-50 pointer-events-none"
        style={{backgroundColor: 'rgba(255,255,255,0.7)'}}
    >
        <h1 className="text-sm">DROP FILES HERE</h1>
    </div>

}