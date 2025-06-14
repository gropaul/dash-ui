import {toast} from "sonner";
import {ConnectionsService} from "@/state/connections-service";
import {useSourceConState} from "@/state/connections-source.state";
import {RelationZustand, useRelationsState} from "@/state/relations.state";
import {getImportQuery} from "@/state/connections-database/duckdb-wasm/utils";
import {FileUploadState} from "./file-drop-overlay";
import {DatabaseConnection} from "@/model/database-connection";

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
                await connection.executeQuery(query);
            } else {
                // Permanent import - copy all tables into the current database
                console.log('Permanent import of database', file.name);

                // Attach the database temporarily
                const query = await getImportQuery(file.name, databaseName, 'database');
                await connection.executeQuery(query);

                // get current catalog
                const currentCatalogData = await connection.executeQuery(`SELECT current_catalog();`);
                const currentCatalog = currentCatalogData.rows[0][0];

                // Copy all tables from the attached database to the current database
                const copyQuery = `COPY FROM DATABASE ${databaseName} TO ${currentCatalog};`;
                console.log('Copy query executed:', copyQuery);
                await connection.executeQuery(copyQuery);

                // Detach the database
                const detachQuery = `DETACH DATABASE ${databaseName};`;
                await connection.executeQuery(detachQuery);
            }

            const refreshConnection = useSourceConState.getState().refreshConnection;
            await refreshConnection(connection.id);

            const showDatabase = useRelationsState.getState().showDatabase;
            showDatabase(connection.id, databaseName);
            const dashState = await getDashStateIfExits(connection, databaseName);
            if (dashState) {
                setFileUploadState({state: 'database_found_dash_state', message: 'Found Dashboards in imported Database', dashState: dashState});
            } else {
                setFileUploadState({state: 'done', message: 'Database imported successfully!'});
                toast.success('Database imported successfully!');
            }
        }
    } catch (err: any) {
        console.error('Database import failed', err);
        setFileUploadState({state: 'error', message: err.message || 'Something went wrong'});
        toast.error('Failed to import database');
    }
};


export async function getDashStateIfExits(
    connection: DatabaseConnection,
    database_name: string,
): Promise<RelationZustand | undefined> {
    // get the schema now with the new database, look for schema dash and table relationState
    const tables = await connection.executeQuery(` SELECT table_catalog, table_schema, table_name
                                                   FROM information_schema.tables
                                                   WHERE table_catalog = '${database_name}'
                                                     AND table_schema = 'dash'
                                                     AND table_name = 'relationState'`);

    if (tables.rows.length > 0) {
        const table = tables.rows[0];
        const tableCatalog = table[0] as string;
        const tableSchema = table[1] as string;
        const tableName = table[2] as string;

        // get the relationState
        const relationState = await connection.executeQuery(`SELECT id, value, version FROM ${tableCatalog}.${tableSchema}.${tableName}`);
        const json_value_string = relationState.rows[0][1] as string;

        const json_value = JSON.parse(json_value_string);
        // this is a relationState json
        return json_value.state as RelationZustand;
    }

    // if no relationState table is found, return undefined
    return undefined;

}