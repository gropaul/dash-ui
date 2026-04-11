import {ConnectionsService} from "@/state/connections/connections-service";
import {DASH_CACHE_DATABASE_CATALOG} from "@/platform/global-data";
import {TABLE_MACRO_PREFIX} from "@/platform/global-data";
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
                    -- filter out dash table macros
                    WHERE NOT (function_type = 'table_macro' AND internal = false AND function_name LIKE '${TABLE_MACRO_PREFIX}%')
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
        .filter(r => r.origin !== 'dashboard' && r.relation.query.baseQuery)
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
        const result = await ConnectionsService.getInstance().executeQuery(
            `SELECT c.table_catalog, c.table_schema, c.table_name, c.column_name, c.data_type
             FROM information_schema.columns c
             WHERE c.table_schema NOT IN ('information_schema', 'pg_catalog')
               AND c.table_catalog != '${DASH_CACHE_DATABASE_CATALOG}'
             ORDER BY c.table_catalog, c.table_schema, c.table_name, c.ordinal_position`
        );

        const catalogIdx = result.columns.findIndex(c => c.name === 'table_catalog');
        const schemaIdx = result.columns.findIndex(c => c.name === 'table_schema');
        const tableIdx = result.columns.findIndex(c => c.name === 'table_name');
        const columnIdx = result.columns.findIndex(c => c.name === 'column_name');
        const typeIdx = result.columns.findIndex(c => c.name === 'data_type');

        // Group into Database → Table → Column hierarchy
        const dbMap = new Map<string, Map<string, Column[]>>();
        for (const row of result.rows) {
            const dbKey = `${row[catalogIdx]}.${row[schemaIdx]}`;
            if (!dbMap.has(dbKey)) dbMap.set(dbKey, new Map());
            const tableMap = dbMap.get(dbKey)!;
            const tableName = row[tableIdx] as string;
            if (!tableMap.has(tableName)) tableMap.set(tableName, []);
            const colName = row[columnIdx] as string;
            tableMap.get(tableName)!.push({name: colName, escapedName: normalizeIdentifier(colName), type: row[typeIdx] as string});
        }

        return Array.from(dbMap.entries()).map(([dbKey, tableMap]) => ({
            name: dbKey,
            escapedName: normalizeIdentifier(dbKey),
            type: 'ordinary',
            children: Array.from(tableMap.entries()).map(([tableName, columns]) => ({
                name: tableName,
                escapedName: normalizeIdentifier(tableName),
                type: 'ordinary' as const,
                children: columns,
            })),
        }));
    } catch (error) {
        console.error('Error fetching database structure');
        console.error(error);
        return [];
    }
}
