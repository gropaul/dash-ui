'use client';

import {FileDrop} from "@/components/basics/input/file-drop";
import React from "react";
import {RelationSourceFile} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {creatTableIfNotExistsFromFilePath} from "@/state/connections/duckdb-helper";
import {ConnectionsService} from "@/state/connections/connections-service";
import {deleteFile, uploadFile} from "@/app/api/upload/utils";

interface Props {
    className?: string;
    children?: React.ReactNode;
}

export type FileUploadState = 'idle' | 'uploading' | 'done' | 'error';

export function FileDropRelation(props: Props) {

    const [fileIsHovered, setFileIsHovered] = React.useState(false);
    const showRelation = useRelationsState(state => state.showRelationFromSource);
    const [fileUploadState, setFileUploadState] = React.useState<FileUploadState>('idle');

    async function onDrop(files: File[]) {
        for (const file of files) {
            const {downloadUrl, fileName} = await uploadFile(file);
            const localDuckDBConnection = ConnectionsService.getInstance().getConnection(CONNECTION_ID_DUCKDB_LOCAL);
            await creatTableIfNotExistsFromFilePath(localDuckDBConnection, downloadUrl, fileName);
            // delete the file after uploading
            const success = await deleteFile(fileName);
            console.log('file deleted', success);
        }
    }

    return <FileDrop
        className={props.className}
        onDrop={onDrop}
        onOverUpdate={(isOver, _files) => {
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