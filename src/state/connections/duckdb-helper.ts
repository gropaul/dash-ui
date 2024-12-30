import {duckDBTypeToValueType} from "@/model/value-type";
import {RelationData, RelationSource, RelationSourceTable} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {DataConnection, DataSource, DataSourceElement, DataSourceGroup} from "@/model/connection";
import {useConnectionsState} from "@/state/connections.state";
import {DUCKDB_BASE_SCHEMA, DUCKDB_IN_MEMORY_DB} from "@/platform/global-data";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";
import {ConnectionsService} from "@/state/connections/connections-service";
import {removeSemicolon} from "@/platform/sql-utils";


export async function onDuckDBDataSourceClick(
    connection: DataConnection,
    id_path: string[],
    dataSources: DataSource[]
) {


    // if path has one element, it’s a database
    if (id_path.length === 1) {
        const showDatabase = useRelationsState.getState().showDatabase;

        const database = findNodeInTrees(dataSources, id_path);
        if (database) {
            const connectionId = connection.id;
            await showDatabase(connectionId, database as DataSourceGroup);
        }
    }

    // if path has two elements, it’s a schema
    else if (id_path.length === 2) {

        const showSchema = useRelationsState.getState().showSchema;

        const [databaseName, _schemaName] = id_path;

        const schema = findNodeInTrees(dataSources, id_path);
        if (schema) {
            const connectionId = connection.id;
            await showSchema(connectionId, databaseName, schema as DataSourceGroup);
        }
    }


    // if path has tree elements, it’s a table
    else if (id_path.length === 3) {

        const showRelation = useRelationsState.getState().showRelationFromSource;

        const [databaseName, schemaName, relationName] = id_path;
        const source: RelationSource = {
            type: 'table',
            database: databaseName,
            schema: schemaName,
            tableName: relationName,
        };
        await showRelation(connection.id, source);
    }
}


export async function loadDuckDBDataSources(executeQuery: (query: string) => Promise<RelationData>): Promise<DataSource[]> {
// get all columns and tables

    const query = `SELECT table_catalog, table_schema, table_name, column_name, data_type
                   FROM information_schema.columns
                   ORDER BY table_catalog, table_name, ordinal_position;`;

    const rows = await executeQuery(query);
    // will have format [database_name: table_schema: table_name: {column_name, data_type}]
    const map: any = {}

    for (const row of rows.rows) {
        const [database, table_schema, table_name, column_name, type] = row;
        if (!map[database]) {
            map[database] = {};
        }
        if (!map[database][table_schema]) {
            map[database][table_schema] = {};
        }

        if (!map[database][table_schema][table_name]) {
            map[database][table_schema][table_name] = [];
        }

        map[database][table_schema][table_name].push([column_name, type]);
    }

    let localDataSources: DataSource[] = [];

    for (const database in map) {
        const database_schemas: DataSourceGroup[] = [];
        for (const table_schema in map[database]) {
            const schema_tables: DataSourceElement[] = [];
            for (const table in map[database][table_schema]) {
                const columns = map[database][table_schema][table];

                // add relation to schema
                schema_tables.push({
                    id: table,
                    type: 'relation',
                    name: table,
                    children: columns.map(([column, type]: [string, string]) => {
                        return {
                            name: column,
                            type: duckDBTypeToValueType(type),
                            children: null,
                        };
                    })
                });
            }

            // add schema to database
            database_schemas.push({
                id: table_schema,
                type: 'schema',
                name: table_schema,
                children: schema_tables,
            });
        }

        // add database to data sources
        localDataSources.push({
            id: database,
            type: 'database',
            name: database,
            children: database_schemas,
        });
    }
    return localDataSources;
}


export async function getDuckDBCurrentPath(executeQuery: (query: string) => Promise<RelationData>): Promise<[string, string]> {
    // get the root directory
    const rootDirectoryQuery = `SELECT file_name(pwd()),pwd();`;
    const rootDirectory = await executeQuery(rootDirectoryQuery);
    const rootName = rootDirectory.rows[0][0];
    const rootPath = rootDirectory.rows[0][1];

    return [rootName, rootPath];
}

export async function creatTableIfNotExistsFromFilePath(connection: DataConnection, filePath: string, tableName: string): Promise<string> {

    const tableNameEscaped = `"${tableName}"`;
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableNameEscaped} AS
        SELECT *
        FROM '${filePath}';`;
    const _result = await connection.executeQuery(createTableQuery);

    await useConnectionsState.getState().loadAllDataSources(connection.id);

    const relationSource: RelationSourceTable = {
        type: 'table',
        database: DUCKDB_IN_MEMORY_DB,
        schema: DUCKDB_BASE_SCHEMA,
        tableName: tableName,
    }

    await useRelationsState.getState().showRelationFromSource(connection.id, relationSource);

    return tableName;
}


export type FileFormat = 'csv' | 'json' | 'parquet' | 'xlsx';


async function getAndPrepareExportQuery(query: string, path: string, fileFormat: FileFormat, connectionId: string): Promise<string> {

    // remove query terminator if present
    const preparedSQL = removeSemicolon(query);

    switch (fileFormat) {
        case 'csv':
            return `COPY (${preparedSQL}) TO '${path}' (FORMAT 'csv', HEADER, DELIMITER ',');`
        case 'json':
            return `COPY (${preparedSQL}) TO '${path}' (FORMAT 'json');`
        case 'parquet':
            return `COPY (${preparedSQL}) TO '${path}' (FORMAT 'parquet');`
        case 'xlsx':

            // install and load the spatial extension (https://duckdb.org/docs/guides/file_formats/excel_export.html)

            const installQuery = "INSTALL spatial;";
            await ConnectionsService.getInstance().executeQuery(connectionId, installQuery);
            const loadQuery = "LOAD spatial;";
            await ConnectionsService.getInstance().executeQuery(connectionId, loadQuery);

            return `COPY (${preparedSQL}) TO '${path}' WITH (FORMAT GDAL, DRIVER 'xlsx');`
    }

}

export async function exportQueryToFile(query: string, path: string, fileFormat: FileFormat, connectionId: string) {
    const exportQuery = await getAndPrepareExportQuery(query, path, fileFormat, connectionId);
    return await ConnectionsService.getInstance().executeQuery(connectionId, exportQuery);
}