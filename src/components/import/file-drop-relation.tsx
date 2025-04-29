import React from "react";
import {FileDrop} from "@/components/basics/input/file-drop";
import {useRelationsState} from "@/state/relations.state";
import {toast} from "sonner";
import {ConnectionsService} from "@/state/connections-service";
import {RelationSource} from "@/model/relation";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {getImportQuery, inferFileTableName} from "@/state/connections-database/duckdb-wasm/utils";
import {AlertCircle, CheckCircle, CloudUpload, XCircle} from "lucide-react";
import {AnimatePresence, motion} from "framer-motion";
import {useGUIState} from "@/state/gui.state";
import {FileFormat} from "@/state/connections-source/duckdb-helper";
import {useSourceConState} from "@/state/connections-source.state";

interface Props {
    className?: string;
    children?: React.ReactNode;
}

interface FileUploadState {
    state: 'idle' | 'hovering' | 'uploading' | 'done' | 'error';
    message?: string;
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
        setFileUploadState({state: 'uploading', message: 'Importing files...'});
        try {
            const service = ConnectionsService.getInstance();
            if (service.hasDatabaseConnection()) {
                const connection = service.getDatabaseConnection();
                await connection.mountFiles(files);

                const tableNames: string[] = [];
                const tableFormats: FileFormat[] = [];
                for (const file of files) {
                    const fileFormat = await inferFileTableName(file);
                    if (!fileFormat) {
                        throw new Error(`Unsupported file format for ${file.name}`);
                    }
                    const tableName = file.name.replace(/\.[^/.]+$/, '');
                    const query = await getImportQuery(file.name, tableName, fileFormat);
                    await connection.executeQuery(query);
                    tableNames.push(tableName);
                    tableFormats.push(fileFormat);
                }

                const refreshConnection = useSourceConState.getState().refreshConnection;
                await refreshConnection(connection.id);

                const showRelation = useRelationsState.getState().showRelationFromSource;
                const showDatabase = useRelationsState.getState().showDatabase;
                const catalog = await connection.executeQuery(`SELECT current_catalog();`);
                const dbName = catalog.rows[0][0];
                tableNames.forEach((name, index) => {
                    const tableFormat = tableFormats[index];

                    if (tableFormat === 'database') {
                        showDatabase(connection.id, name);
                    } else {
                        let source: RelationSource = {
                            type: 'table',
                            database: dbName,
                            schema: 'main',
                            tableName: name,
                        };
                        showRelation(connection.id, source, DEFAULT_RELATION_VIEW_PATH);
                    }
                });

                setFileUploadState({state: 'done', message: 'Imported successfully!'});
                toast.success('Files imported successfully!');
            }
        } catch (err: any) {
            console.error('Import failed', err);
            setFileUploadState({state: 'error', message: err.message || 'Something went wrong'});
            toast.error('Failed to import files');
        }
    }

    const onErrorConfirm = () => setFileUploadState({state: 'idle'});

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
            <Overlay state={fileUploadState} onErrorConfirm={onErrorConfirm}/>
        </FileDrop>
    );
}

interface OverlayProps {
    state: FileUploadState;
    onErrorConfirm: () => void;
}

const Overlay: React.FC<OverlayProps> = ({state, onErrorConfirm}) => (
    <AnimatePresence>
        {state.state !== 'idle' && (
            <motion.div
                className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
            >
                <motion.div
                    className="flex flex-col items-center"
                    initial={{scale: 0.8}}
                    animate={{scale: 1}}
                    exit={{scale: 0.8}}
                >
                    {state.state === 'hovering' && (
                        <>
                            <CloudUpload className="w-12 h-12 text-gray-600 mb-2 animate-pulse"/>
                            <p className="text-gray-700">Drop files here</p>
                        </>
                    )}

                    {state.state === 'uploading' && (
                        <>
                            <CloudUpload className="w-12 h-12 text-blue-500 mb-2 animate-spin"/>
                            <p className="text-blue-600">{state.message}</p>
                        </>
                    )}

                    {state.state === 'done' && (
                        <>
                            <CheckCircle className="w-12 h-12 text-green-500 mb-2"/>
                            <p className="text-green-600">{state.message}</p>
                        </>
                    )}

                    {state.state === 'error' && (
                        <>
                            <AlertCircle className="w-12 h-12 text-red-500 mb-2"/>
                            <p className="text-red-600 mb-4">{state.message}</p>
                            <button
                                onClick={onErrorConfirm}
                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none"
                            >
                                <XCircle className="w-5 h-5 mr-2"/>
                                OK
                            </button>
                        </>
                    )}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);