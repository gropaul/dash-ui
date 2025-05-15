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
import {onDatabaseAttached} from "@/state/connections-database/utils";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

interface Props {
    className?: string;
    children?: React.ReactNode;
}

interface FileUploadState {
    state: 'idle' | 'hovering' | 'uploading' | 'done' | 'error' | 'format_selection' | 'database_import_selection';
    message?: string;
    file?: File;
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
                        setFileUploadState({
                            state: 'format_selection',
                            message: `Unsupported file format for ${file.name}. Please select a format:`,
                            file: file
                        });
                        return; // Stop processing and wait for user input
                    }

                    // If it's a database file, ask the user about import preferences
                    if (fileFormat === 'database') {
                        setFileUploadState({
                            state: 'database_import_selection',
                            message: `How would you like to import the database ${file.name}?`,
                            file: file
                        });
                        return; // Stop processing and wait for user input
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
                        onDatabaseAttached(connection, name);
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

    const onDatabaseImportSelect = async (importType: 'temporary' | 'permanent', file: File) => {
        setFileUploadState({state: 'uploading', message: `Importing database ${importType === 'temporary' ? 'temporarily' : 'permanently'}...`});
        try {
            const service = ConnectionsService.getInstance();
            if (service.hasDatabaseConnection()) {
                const connection = service.getDatabaseConnection();

                // Mount the file if it hasn't been mounted already
                await connection.mountFiles([file]);

                const tableName = file.name.replace(/\.[^/.]+$/, '');

                if (importType === 'temporary') {
                    // Temporary attachment - just attach the database
                    const query = await getImportQuery(file.name, tableName, 'database');
                    await connection.executeQuery(query);
                } else {
                    // Permanent import - copy all tables into the current database
                    // This is just a skeleton - the actual implementation will be done later
                    console.log('Permanent import of database', file.name);

                    // Attach the database temporarily
                    const query = await getImportQuery(file.name, tableName, 'database');
                    await connection.executeQuery(query);

                    // get current catalog
                    const currentCatalogData = await connection.executeQuery(`SELECT current_catalog();`);
                    const currentCatalog = currentCatalogData.rows[0][0];

                    // Copy all tables from the attached database to the current database
                    const copyQuery = `COPY FROM DATABASE ${tableName} TO ${currentCatalog};`;
                    console.log('Copy query executed:', copyQuery);
                    await connection.executeQuery(copyQuery);

                    // Detach the database
                    const detachQuery = `DETACH DATABASE ${tableName};`;
                    await connection.executeQuery(detachQuery);
                }

                const refreshConnection = useSourceConState.getState().refreshConnection;
                await refreshConnection(connection.id);

                const showDatabase = useRelationsState.getState().showDatabase;
                showDatabase(connection.id, tableName);
                onDatabaseAttached(connection, tableName);

                setFileUploadState({state: 'done', message: 'Database imported successfully!'});
                toast.success('Database imported successfully!');
            }
        } catch (err: any) {
            console.error('Database import failed', err);
            setFileUploadState({state: 'error', message: err.message || 'Something went wrong'});
            toast.error('Failed to import database');
        }
    };

    const onFormatSelect = async (format: FileFormat, file: File) => {
        // If database format is selected, show the database import selection dialog
        if (format === 'database') {
            setFileUploadState({
                state: 'database_import_selection',
                message: `How would you like to import the database ${file.name}?`,
                file: file
            });
            return;
        }

        setFileUploadState({state: 'uploading', message: 'Importing files...'});
        try {
            const service = ConnectionsService.getInstance();
            if (service.hasDatabaseConnection()) {
                const connection = service.getDatabaseConnection();

                // Mount the file if it hasn't been mounted already
                await connection.mountFiles([file]);

                // Process the file with the selected format
                const tableName = file.name.replace(/\.[^/.]+$/, '');
                const query = await getImportQuery(file.name, tableName, format);
                await connection.executeQuery(query);

                const refreshConnection = useSourceConState.getState().refreshConnection;
                await refreshConnection(connection.id);

                const showRelation = useRelationsState.getState().showRelationFromSource;
                const catalog = await connection.executeQuery(`SELECT current_catalog();`);
                const dbName = catalog.rows[0][0];

                let source: RelationSource = {
                    type: 'table',
                    database: dbName,
                    schema: 'main',
                    tableName: tableName,
                };
                showRelation(connection.id, source, DEFAULT_RELATION_VIEW_PATH);

                setFileUploadState({state: 'done', message: 'Imported successfully!'});
                toast.success('File imported successfully!');
            }
        } catch (err: any) {
            console.error('Import failed', err);
            setFileUploadState({state: 'error', message: err.message || 'Something went wrong'});
            toast.error('Failed to import file');
        }
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
            <Overlay 
                state={fileUploadState} 
                onErrorConfirm={onErrorConfirm} 
                onFormatSelect={onFormatSelect}
                onDatabaseImportSelect={onDatabaseImportSelect}
            />
        </FileDrop>
    );
}

interface OverlayProps {
    state: FileUploadState;
    onErrorConfirm: () => void;
    onFormatSelect?: (format: FileFormat, file: File) => void;
    onDatabaseImportSelect?: (importType: 'temporary' | 'permanent', file: File) => void;
}

const Overlay: React.FC<OverlayProps> = ({state, onErrorConfirm, onFormatSelect, onDatabaseImportSelect}) => (
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
                            <Button
                                onClick={onErrorConfirm}
                                variant="destructive"
                            >
                                <XCircle className="w-5 h-5"/>
                                OK
                            </Button>
                        </>
                    )}

                    {state.state === 'format_selection' && state.file && onFormatSelect && (
                        <>
                            <AlertCircle className="w-12 h-12 text-yellow-500 mb-2"/>
                            <p className="text-yellow-600 mb-4">{state.message}</p>
                            <div className="flex flex-col items-center mb-4">
                                <Select
                                    onValueChange={(value) => onFormatSelect(value as FileFormat, state.file!)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="csv">CSV</SelectItem>
                                        <SelectItem value="json">JSON</SelectItem>
                                        <SelectItem value="parquet">Parquet</SelectItem>
                                        <SelectItem value="xlsx">Excel</SelectItem>
                                        <SelectItem value="database">Database</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={onErrorConfirm}
                                    variant="secondary"
                                >
                                    <XCircle className="w-5 h-5"/>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}

                    {state.state === 'database_import_selection' && state.file && onDatabaseImportSelect && (
                        <>
                            <AlertCircle className="w-12 h-12 text-blue-500 mb-2"/>
                            <p className="text-blue-600 mb-4">{state.message}</p>
                            <div className="flex flex-col items-center mb-4">
                                <div className="flex space-x-4 mb-4">
                                    <Button
                                        onClick={() => onDatabaseImportSelect('temporary', state.file!)}
                                        variant="default"
                                        className="px-4"
                                    >
                                        Temporary Attachment
                                    </Button>
                                    <Button
                                        onClick={() => onDatabaseImportSelect('permanent', state.file!)}
                                        variant="default"
                                        className="px-4"
                                    >
                                        Copy Into Browser
                                    </Button>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 text-center">
                                    Temporary attachment will lose data on reload. <br/>
                                    Copy into browser will import all tables into the current database.
                                </p>
                                <Button
                                    onClick={onErrorConfirm}
                                    variant="secondary"
                                >
                                    <XCircle className="w-5 h-5"/>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);
