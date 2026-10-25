import {duckDBTypeToValueType} from "@/model/value-type";
import {RelationData, RelationSource} from "@/model/relation";
import {DataSource, DataSourceElement, DataSourceGroup} from "@/model/data-source-connection";
import {ConnectionsService} from "@/state/connections/connections-service";
import {removeSemicolon} from "@/platform/sql-utils";
import {dashInternalObjectsFilter} from "@/platform/global-data";
import {isDebugMode} from "@/components/settings/about-content";


/** A table of the tree, three levels down: database, schema, table. Databases and schemas open nothing. */
export async function onDuckDBDataSourceClick(id_path: string[]): Promise<RelationSource | undefined> {
    if (id_path.length !== 3) return;
    const [database, schema, tableName] = id_path;
    return {type: 'table', database, schema, tableName};
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
    const isDebug = isDebugMode();
    const conditionFilterCache = isDebug ? `TRUE` : dashInternalObjectsFilter('c.table_catalog', 'c.table_schema');
    // duckdb_tables() supplies the estimated row count (base tables only → NULL for views).
    const query = `SELECT c.table_catalog, c.table_schema, c.table_name, t.table_type, c.column_name, c.data_type, dt.estimated_size
                   FROM information_schema.columns as c
                            JOIN information_schema.tables as t ON
                       t.table_name = c.table_name and
                       t.table_schema = c.table_schema and
                       t.table_catalog = c.table_catalog
                            LEFT JOIN duckdb_tables() as dt ON
                       dt.table_name = c.table_name and
                       dt.schema_name = c.table_schema and
                       dt.database_name = c.table_catalog
                   WHERE ${conditionFilterCache}
                   ORDER BY c.table_catalog, c.table_name, c.ordinal_position;
    `;

    const rows = await executeQuery(query);
    // will have format [database_name: table_schema: table_name: {column_name, data_type}]
    const map: any = {}
    const types: any = {};
    const sizes: any = {};
    for (const row of rows.rows) {
        const [database, table_schema, table_name, table_type, column_name, type, estimated_size] = row;
        if (!map[database]) {
            map[database] = {};
            types[database] = {};
            sizes[database] = {};
        }
        if (!map[database][table_schema]) {
            map[database][table_schema] = {};
            types[database][table_schema] = {};
            sizes[database][table_schema] = {};
        }

        if (!map[database][table_schema][table_name]) {
            map[database][table_schema][table_name] = [];
            types[database][table_schema][table_name] = getType(table_type);
            sizes[database][table_schema][table_name] = estimated_size == null ? undefined : Number(estimated_size);
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
                const estimatedRows = sizes[database][table_schema][table];
                // add relation to schema
                schema_tables.push({
                    id: table,
                    type: type,
                    name: table,
                    payload: estimatedRows === undefined ? undefined : {estimatedRows},
                    children: columns.map(([column, type]: [string, string]) => {
                        return {
                            id: column,
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