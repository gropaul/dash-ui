import {DataSource, DataSourceElement} from "@/state/connections.state";
import {duckDBTypeToValueType} from "@/model/value-type";
import { RelationData} from "@/model/relation";

export const DUCK_DB_IN_MEMORY_DB = 'memory';

export async function loadDuckDBDataSources(executeQuery: (query: string) => Promise<RelationData>): Promise<DataSource[]> {
// get all columns and tables

    const query = `SELECT table_catalog, table_name, column_name, data_type
                       FROM information_schema.columns
                       ORDER BY table_catalog, table_name, ordinal_position;`;

    const rows = await executeQuery(query);
    // will have format [database_name: table_name: {column_name, data_type}]
    const map: any = {}

    for (const row of rows.rows) {
        const [database, table, column, type] = row;
        if (!map[database]) {
            map[database] = {};
        }
        if (!map[database][table]) {
            map[database][table] = [];
        }
        map[database][table].push([column, type]);
    }

    let localDataSources: DataSource[] = [];

    for (const database in map) {
        const children: DataSourceElement[] = [];
        for (const table in map[database]) {
            const columns = map[database][table];

            children.push({
                type: 'relation',
                name: table,
                children: columns.map(([column, type]: [string, string]) => {
                    return {
                        name: column,
                        type: duckDBTypeToValueType(type)
                    };
                })
            });
        }
        localDataSources.push({
            type: 'database',
            name: database,
            children
        });
    }
    return localDataSources;
}