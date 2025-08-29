import {duckDBTypeToValueType} from "@/model/value-type";
import {RelationData, RelationSource} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {DataSource, DataSourceConnection, DataSourceElement, DataSourceGroup} from "@/model/data-source-connection";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";
import {ConnectionsService} from "@/state/connections/connections-service";
import {removeSemicolon} from "@/platform/sql-utils";
import {useDataSourcesState} from "@/state/data-sources.state";
import {DatabaseState, getDatabaseId} from "@/model/database-state";
import {getSchemaId, SchemaState} from "@/model/schema-state";


export function GetDatabaseState(connectionId: string, databaseId: string): DatabaseState {
    const sourceConnection = useDataSourcesState.getState().getSourceConnection(connectionId);
    const databaseSource = sourceConnection?.dataSources[databaseId]!;
    const databaseTabId = getDatabaseId(connectionId, databaseId); // Generate the database ID

    if (!databaseSource) {
        throw new Error(`Database ${databaseId} not found`);
    }
    return {
        ...databaseSource as any,
        id: databaseTabId,
        databaseId: databaseId,
        connectionId,
    };
}

export function GetSchemaState(
        connectionId: string,
        databaseId: string,
        schema: DataSourceGroup
): SchemaState {
    const schemaId = getSchemaId(connectionId, databaseId, schema); // Generate the schema ID

    return {
        ...schema,
        connectionId,
        databaseId: databaseId,
        schemaId: schema.id,
        id: schemaId,
    };
}

export async function onDuckDBDataSourceClick(
    connection: DataSourceConnection,
    id_path: string[],
    dataSources: { [key: string]: DataSource },
) {

    // if path has one element, it’s a database
    if (id_path.length === 1) {
        const database = findNodeInTrees(Object.values(dataSources), id_path);
        if (database) {
            const state = GetDatabaseState(connection.id, database.id);
            return useRelationsState.getState().showEntity('databases', state, [])
        }
    }

    // if the path has two elements, it’s a schema
    else if (id_path.length === 2) {
        const schema = findNodeInTrees(Object.values(dataSources), id_path)  as DataSourceGroup;
        if (schema) {
            const state = GetSchemaState(connection.id, id_path[0], schema);
            return useRelationsState.getState().showEntity('schemas', state, []);
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
        await showRelation(connection.id, source, DEFAULT_RELATION_VIEW_PATH);
    }
}

export async function attachDatabase(path: string, executeQuery: (query: string) => Promise<RelationData>) {
    // if this is a remote db first load httpfs extension
    if (path.startsWith('http://') || path.startsWith('https://')) {
        const installQuery = "INSTALL httpfs;";
        await executeQuery(installQuery);
        const loadQuery = "LOAD httpfs;";
        await executeQuery(loadQuery);
    }

    const query = `ATTACH IF NOT EXISTS '${path}';`;
    await executeQuery(query);
}

function getType(duckDBType: string): string {
    // The type of table. One of: BASE TABLE, LOCAL TEMPORARY, VIEW.
    if (duckDBType === 'BASE TABLE') {
        return 'relation';
    } else if (duckDBType === 'LOCAL TEMPORARY') {
        return 'relation';
    } else if (duckDBType === 'VIEW') {
        return 'view';
    } else {
        return 'unknown';
    }
}

export async function loadDuckDBDataSources(executeQuery: (query: string) => Promise<RelationData>): Promise<{
    [database: string]: DataSource
}> {
// get all columns and tables

    const query = `SELECT c.table_catalog, c.table_schema, c.table_name, t.table_type, c.column_name, c.data_type
                   FROM information_schema.columns as c
                            JOIN information_schema.tables as t ON
                       t.table_name = c.table_name and
                       t.table_schema = c.table_schema and
                       t.table_catalog = c.table_catalog
                   WHERE c.table_schema NOT IN ('dash')
                   ORDER BY c.table_catalog, c.table_name, c.ordinal_position;
    `;

    const rows = await executeQuery(query);
    // will have format [database_name: table_schema: table_name: {column_name, data_type}]
    const map: any = {}
    const types: any = {};
    for (const row of rows.rows) {
        const [database, table_schema, table_name, table_type, column_name, type] = row;
        if (!map[database]) {
            map[database] = {};
            types[database] = {};
        }
        if (!map[database][table_schema]) {
            map[database][table_schema] = {};
            types[database][table_schema] = {};
        }

        if (!map[database][table_schema][table_name]) {
            map[database][table_schema][table_name] = [];
            types[database][table_schema][table_name] = getType(table_type);
        }

        map[database][table_schema][table_name].push([column_name, type]);
    }

    let localDataSources: { [key: string]: DataSource } = {};

    for (const database in map) {
        const database_schemas: DataSourceGroup[] = [];
        for (const table_schema in map[database]) {
            const schema_tables: DataSourceElement[] = [];
            for (const table in map[database][table_schema]) {
                const columns = map[database][table_schema][table];
                const type = types[database][table_schema][table];
                // add relation to schema
                schema_tables.push({
                    id: table,
                    type: type,
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
        localDataSources[database] = {
            id: database,
            type: 'database',
            name: database,
            children: database_schemas,
        };
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


export type FileFormat = 'csv' | 'json' | 'parquet' | 'xlsx' | 'database';


async function getAndPrepareExportQuery(query: string, path: string, fileFormat: FileFormat): Promise<string> {

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
            const installQuery = "INSTALL spatial;";
            await ConnectionsService.getInstance().executeQuery(installQuery);
            const loadQuery = "LOAD spatial;";
            await ConnectionsService.getInstance().executeQuery(loadQuery);

            return `COPY (${preparedSQL}) TO '${path}' WITH (FORMAT GDAL, DRIVER 'xlsx');`
        case 'database':
            throw new Error('Exporting to database is not supported');
    }

}

export async function exportQueryToFile(query: string, path: string, fileFormat: FileFormat) {
    const exportQuery = await getAndPrepareExportQuery(query, path, fileFormat);
    return await ConnectionsService.getInstance().executeQuery(exportQuery);
}