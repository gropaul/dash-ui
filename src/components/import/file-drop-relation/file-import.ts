import {toast} from "sonner";
import {ConnectionsService} from "@/state/connections-service";
import {useSourceConState} from "@/state/connections-source.state";
import {useRelationsState} from "@/state/relations.state";
import {getImportQuery, inferFileTableName} from "@/state/connections-database/duckdb-wasm/utils";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {RelationSource} from "@/model/relation";
import {FileFormat} from "@/state/connections-source/duckdb-helper";
import {FileUploadState} from "./file-drop-overlay";

export const handleFileImport = async (
    format: FileFormat,
    file: File,
    setFileUploadState: (state: FileUploadState) => void
): Promise<void> => {
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

/**
 * Handles the drop of multiple files
 * @param files - The files that were dropped
 * @param setFileUploadState - Function to update the file upload state
 */
export const handleFileDrop = async (
    files: File[],
    setFileUploadState: (state: FileUploadState) => void
): Promise<void> => {
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
                        message: `Unknown file format for file "${file.name}". Please select a format:`,
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
            const catalog = await connection.executeQuery(`SELECT current_catalog();`);
            const dbName = catalog.rows[0][0];
            tableNames.forEach((name, index) => {
                let source: RelationSource = {
                    type: 'table',
                    database: dbName,
                    schema: 'main',
                    tableName: name,
                };
                showRelation(connection.id, source, DEFAULT_RELATION_VIEW_PATH);
            });

            setFileUploadState({state: 'done', message: 'Imported successfully!'});
            toast.success('Files imported successfully!');
        }
    } catch (err: any) {
        console.error('Import failed', err);
        setFileUploadState({state: 'error', message: err.message || 'Something went wrong'});
        toast.error('Failed to import files');
    }
};


