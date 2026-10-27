import React from "react";
import {FileDrop} from "@/components/basics/input/file-drop";
import {useGUIState} from "@/state/gui.state";
import {FileFormat} from "@/state/data-source/duckdb-helper";
import {FileDropOverlay, FileUploadState} from "@/components/import/file-drop-relation/file-drop-overlay";
import {handleFileDrop, handleFileImport} from "@/components/import/file-drop-relation/file-import";
import {handleDatabaseImport} from "@/components/import/file-drop-relation/database-import";


interface Props {
    className?: string;
    children?: React.ReactNode;
}

export function FileDropRelation({className, children}: Props) {
    const [fileUploadState, setFileUploadState] = React.useState<FileUploadState>({state: 'idle'});
    const enabled = useGUIState(state => state.relationFileDropEnabled);

    // auto-close overlay after success
    React.useEffect(() => {
        if (fileUploadState.state === 'done') {
            const timer = setTimeout(() => {
                setFileUploadState({state: 'idle'});
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [fileUploadState.state]);

    async function onDrop(files: File[]) {
        if (!enabled) {
            return;
        }
        await handleFileDrop(files, setFileUploadState);
    }

    const onErrorConfirm = () => setFileUploadState({state: 'idle'});

    const onDatabaseImportSelect = async (importType: 'temporary' | 'permanent', file: File) => {
        await handleDatabaseImport(importType, file, setFileUploadState);
    };

    const onFormatSelect = async (format: FileFormat, file: File) => {
        await handleFileImport(format, file, setFileUploadState);
    };

    return (
        <FileDrop
            className={className}
            onDrop={onDrop}
            onOverUpdate={(isOver) => {
                if (!enabled) {
                    return;
                }
                setFileUploadState(prev => ({
                    state: isOver && prev.state === 'idle' ? 'hovering' : isOver ? prev.state : 'idle'
                }));
            }}
        >
            {children}
            <FileDropOverlay
                state={fileUploadState}
                onErrorConfirm={onErrorConfirm}
                onFormatSelect={onFormatSelect}
                onDatabaseImportSelect={onDatabaseImportSelect}
            />
        </FileDrop>
    );
}
