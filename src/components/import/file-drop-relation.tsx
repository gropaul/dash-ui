'use client';

import {FileDrop} from "@/components/basics/input/file-drop";
import React from "react";
import {useRelationsState} from "@/state/relations.state";
import {CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {creatTableIfNotExistsFromFilePath} from "@/state/connections/duckdb-helper";
import {ConnectionsService} from "@/state/connections/connections-service";
import {deleteFile, uploadFile} from "@/app/api/upload/utils";

interface Props {
    className?: string;
    children?: React.ReactNode;
}

export type FileUploadState = 'idle' | 'hovering' | 'uploading' | 'done' | 'error';

export function FileDropRelation(props: Props) {

    const showRelation = useRelationsState(state => state.showRelationFromSource);
    const [fileUploadState, setFileUploadState] = React.useState<FileUploadState>('idle');

    async function onDrop(files: File[]) {
        setFileUploadState('uploading');
        try {
            for (const file of files) {
                await importFilesToDuckWasm(file);
            }

            setFileUploadState('done');
        } catch (e) {
            console.error('Failed to import file', e);
            setFileUploadState('error');
        }

    }

    async function importFilesToDuckWasm(file: File) {
        const duckDBWasm = ConnectionsService.getInstance().getDuckDBWasmConnection();
        await duckDBWasm.createTableFromBrowserFileHandler(file);
    }

    async function importFilesToDuckDBOverHttp(file: File) {
        const {downloadUrl, fileName} = await uploadFile(file);
        const localDuckDBConnection = ConnectionsService.getInstance().getConnection(CONNECTION_ID_DUCKDB_LOCAL);
        await creatTableIfNotExistsFromFilePath(localDuckDBConnection, downloadUrl, fileName);
        // delete the file after uploading
        const success = await deleteFile(fileName);
    }

    const onErrorConfirm = () => {
        setFileUploadState('idle');
    }

    const showFileHover = fileUploadState === 'hovering' || fileUploadState === 'error';
    return <FileDrop
        className={props.className}
        onDrop={onDrop}
        onOverUpdate={(isOver, _files) => {
            if (isOver) {
                if (fileUploadState === 'idle') {
                    setFileUploadState('hovering');
                }
            } else {
                setFileUploadState('idle');
            }
        }}>
        {props.children}
        {showFileHover && <FileHover
            state={fileUploadState}
            onErrorConfirm={onErrorConfirm}
        />}

    </FileDrop>
}

interface FileHoverProps {
    state: FileUploadState;
    onErrorConfirm: () => void;
}

function FileHover(props: FileHoverProps) {
    const state = props.state;
    // make all mouse events not work
    return <div
        className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center z-50 pointer-events-none"
        style={{backgroundColor: 'rgba(255,255,255,0.7)'}}
    >
        {state === 'hovering' && <h1 className="text-sm">DROP FILES HERE</h1>}

        {state === 'uploading' && <h1 className="text-sm">Importing files ...</h1>}
        {state === 'done' && <h1 className="text-sm">Files imported successfully</h1>}
        {state === 'error' &&
            <div className="bg-white p-4 rounded-md pointer-events-auto flex flex-col items-center">
                <h1 className="text-sm">Sorry, but we failed to import the file :(</h1>
                <button
                    className={"bg-red-500 text-white px-4 py-2 rounded-md pointer-events-auto mt-2"}
                    onClick={props.onErrorConfirm}
                >OK
                </button>
            </div>}
    </div>

}