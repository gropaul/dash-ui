import {ConnectionsService} from "@/state/connections/connections-service";
import {DASH_CATALOG} from "@/platform/global-data";
import {DASH_REFS_SCHEMA} from "@/platform/global-data";
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {getMacroName} from "@/state/relations/sql/table-macros";

export type {Column, Database, DatabaseFunction, DatabaseKeyword, Table} from './schema-utils';
export {binarySearchByName, normalizeIdentifier} from './schema-utils';
import {normalizeIdentifier} from './schema-utils';
import type {Column, Table, Database, DatabaseFunction, DatabaseKeyword} from './schema-utils';

export async function getDatabaseFunctions(): Promise<DatabaseFunction[]> {
    try {
        const result = await ConnectionsService.getInstance().executeQuery(
            `SELECT DISTINCT function_name, function_type
                    FROM duckdb_functions()
                    -- filter out dash table macros (they live in the refs schema)
                    WHERE NOT (function_type = 'table_macro' AND database_name = '${DASH_CATALOG}' AND schema_name = '${DASH_REFS_SCHEMA}')
                    ORDER BY ALL`
        );
        return result.rows.map(row => ({name: row[0] as string, type: row[1] as string}));
    } catch {
        return [];
    }
}

export async function getDatabaseKeywords(): Promise<DatabaseKeyword[]> {
    try {
        const result = await ConnectionsService.getInstance().executeQuery(
            `SELECT keyword_name, keyword_category FROM duckdb_keywords() 
                    WHERE keyword_category IN ('type_function', 'reserved') 
                    ORDER BY keyword_name`
        );
        return result.rows.map(row => ({name: row[0] as string, type: row[1]}));
    } catch {
        return [];
    }
}

export async function getDatabaseMacros(): Promise<Table[]> {
    // Merge canvas/dashboard relations as dash_node tables
    const macroTables: Table[] = getAllRelations()
        .filter(r => r.relation.query.baseQuery)
        .map(r => {
            const macroName = getMacroName(r.relation.viewState.displayName);
            return {
                name: macroName,
                escapedName: normalizeIdentifier(macroName),
                type: 'dash_node' as const,
                displayName: r.relation.viewState.displayName,
                query: r.relation.query.baseQuery,
                children: [],
            };
        });
    // Populate columns for each macro via DESCRIBE
    const macroColumns = await getMacroColumns(macroTables.map(t => t.name));
    for (const t of macroTables) {
        t.children = macroColumns.get(t.name) ?? [];
    }
    return macroTables;
}

/**
 * For each macro name in the list, fetch its output columns via DESCRIBE.
 * Uses a single batched SELECT:
 *   SELECT node_a: (SELECT list({...}) FROM (DESCRIBE FROM node_a())), ...
 * Returns a map from macro name → Column[].
 * Macros that fail to describe (e.g. invalid SQL) are omitted from the map.
 */
async function getMacroColumns(macroNames: string[]): Promise<Map<string, Column[]>> {
    if (macroNames.length === 0) return new Map();
    try {
        const selects = macroNames
            .map(name => `"${name}": (SELECT list({column_name: column_name, column_type: column_type}) FROM (DESCRIBE FROM "${name}"()))`)
            .join(',\n  ');
        const result = await ConnectionsService.getInstance().executeQuery(`SELECT ${selects}`);
        const map = new Map<string, Column[]>();
        if (result.rows.length === 0) return map;
        const row = result.rows[0];
        for (let i = 0; i < result.columns.length; i++) {
            const macroName = result.columns[i].name;
            const entries = row[i] as Array<{column_name: string; column_type: string}> | null;
            if (Array.isArray(entries)) {
                map.set(macroName, entries.map(e => ({
                    name: e.column_name,
                    escapedName: normalizeIdentifier(e.column_name),
                    type: e.column_type,
                })));
            }
        }
        return map;
    } catch {
        return new Map();
    }
}

export async function getDatabaseStructure(): Promise<Database[]> {
    try {
        // Driven by DuckDB's internal metadata functions instead of information_schema.
        // duckdb_columns() covers both tables and views; joining duckdb_databases() adds the
        // catalog type and duckdb_tables() adds the estimated row count (NULL for views).
        // `internal = false` cleanly excludes the system catalog and pg_catalog/information_schema.
        const result = await ConnectionsService.getInstance().executeQuery(
            `SELECT d.database_name AS table_catalog,
                    d.type          AS database_type,
                    c.schema_name   AS table_schema,
                    c.table_name    AS table_name,
                    t.estimated_size AS estimated_size,
                    c.column_name   AS column_name,
                    c.data_type     AS data_type
             FROM duckdb_columns() c
             JOIN duckdb_databases() d USING (database_oid)
             LEFT JOIN duckdb_tables() t USING (table_oid)
             WHERE c.internal = false
               AND d.database_name != '${DASH_CATALOG}'
             ORDER BY d.database_name, c.schema_name, c.table_name, c.column_index`
        );

        const catalogIdx = result.columns.findIndex(c => c.name === 'table_catalog');
        const dbTypeIdx = result.columns.findIndex(c => c.name === 'database_type');
        const schemaIdx = result.columns.findIndex(c => c.name === 'table_schema');
        const tableIdx = result.columns.findIndex(c => c.name === 'table_name');
        const sizeIdx = result.columns.findIndex(c => c.name === 'estimated_size');
        const columnIdx = result.columns.findIndex(c => c.name === 'column_name');
        const typeIdx = result.columns.findIndex(c => c.name === 'data_type');

        // Group into Database → Table → Column hierarchy
        interface DbEntry { type: string; tables: Map<string, {columns: Column[]; estimatedSize?: number}>; }
        const dbMap = new Map<string, DbEntry>();
        for (const row of result.rows) {
            const dbKey = `${row[catalogIdx]}.${row[schemaIdx]}`;
            if (!dbMap.has(dbKey)) dbMap.set(dbKey, {type: row[dbTypeIdx] as string, tables: new Map()});
            const tableMap = dbMap.get(dbKey)!.tables;
            const tableName = row[tableIdx] as string;
            if (!tableMap.has(tableName)) {
                const rawSize = row[sizeIdx];
                tableMap.set(tableName, {columns: [], estimatedSize: rawSize == null ? undefined : Number(rawSize)});
            }
            const colName = row[columnIdx] as string;
            tableMap.get(tableName)!.columns.push({name: colName, escapedName: normalizeIdentifier(colName), type: row[typeIdx] as string});
        }

        return Array.from(dbMap.entries()).map(([dbKey, {type, tables}]) => ({
            name: dbKey,
            escapedName: normalizeIdentifier(dbKey),
            type,
            children: Array.from(tables.entries()).map(([tableName, {columns, estimatedSize}]) => ({
                name: tableName,
                escapedName: normalizeIdentifier(tableName),
                type: 'ordinary' as const,
                estimatedSize,
                children: columns,
            })),
        }));
    } catch (error) {
        console.error('Error fetching database structure');
        console.error(error);
        return [];
    }
}
