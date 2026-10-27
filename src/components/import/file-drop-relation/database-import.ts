import {toast} from "sonner";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useDataSourcesState} from "@/state/data-sources.state";
import {getImportQuery} from "@/state/connections/duckdb-wasm/utils";
import {FileUploadState} from "./file-drop-overlay";

/**
 * Handles the import of a database file
 * @param importType - 'temporary' or 'permanent'
 * @param file - The database file to import
 * @param setFileUploadState - Function to update the file upload state
 */
export const handleDatabaseImport = async (
    importType: 'temporary' | 'permanent',
    file: File,
    setFileUploadState: (state: FileUploadState) => void
): Promise<void> => {
    setFileUploadState({
        state: 'uploading',
        message: `Importing database ${importType === 'temporary' ? 'temporarily' : 'permanently'}...`
    });
    try {
        const service = ConnectionsService.getInstance();
        if (service.hasDatabaseConnection()) {
            const connection = service.getDatabaseConnection();

            // Mount the file if it hasn't been mounted already
            await connection.mountFiles([file]);

            const databaseName = file.name.replace(/\.[^/.]+$/, '');

            if (importType === 'temporary') {
                // Temporary attachment - just attach the database
                const query = await getImportQuery(file.name, databaseName, 'database');
                await connection.executeQuery(query, false);
            } else {
                // Permanent import - copy all tables into the current database
                console.log('Permanent import of database', file.name);

                // Attach the database temporarily
                const query = await getImportQuery(file.name, databaseName, 'database');
                await connection.executeQuery(query, false);

                // get current catalog
                const currentCatalogData = await connection.executeQuery(`SELECT current_catalog();`, false);
                const currentCatalog = currentCatalogData.rows[0][0];

                // Copy all tables from the attached database to the current database
                const copyQuery = `COPY FROM DATABASE ${databaseName} TO ${currentCatalog};`;
                await connection.executeQuery(copyQuery, false);

                // Detach the database
                const detachQuery = `DETACH DATABASE ${databaseName};`;
                await connection.executeQuery(detachQuery, false);
            }

            const refreshConnection = useDataSourcesState.getState().refreshConnection;
            await refreshConnection(connection.id);

            setFileUploadState({state: 'done', message: 'Database imported successfully!'});
            toast.success('Database imported successfully!');
        }
    } catch (err: any) {
        console.error('Database import failed', err);
        setFileUploadState({state: 'error', message: err.message || 'Something went wrong'});
        toast.error('Failed to import database');
    }
};
