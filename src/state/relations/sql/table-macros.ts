import {DASH_CATALOG, DASH_REFS_SCHEMA} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections/connections-service";
import {onRelationEvent, RelationEvent} from "../event/relation-events";
import {StateStorageInfoLoaded} from "@/model/database-connection";
import {ParameterDefinition} from "@/model/relation-view-state/parameters";
import {getAllRelations, RelationWithOrigin} from "@/state/relations/all-relation-utils";
import {removeComments} from "@/platform/sql-utils";

import {useDatabaseState} from "@/state/database.state";
import {ViewManager} from "@/model/relation-state/relation-view";
import {RelationState} from "@/model/relation-state";


/**
 * Check if the database is in read-only mode.
 */
function isDatabaseReadonly(): boolean {
    try {
        const connection = ConnectionsService.getInstance().getDatabaseConnection();
        const storageInfo = connection.storageInfo;
        if (storageInfo.state === 'loaded') {
            return (storageInfo as StateStorageInfoLoaded).databaseReadonly;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * DuckDB reserved keywords that cannot be used as macro names without quoting.
 * References like `refs.from()` fail because the parser treats them as SQL keywords.
 */
const DUCKDB_RESERVED_KEYWORDS = new Set([
    'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric',
    'both', 'case', 'cast', 'check', 'collate', 'column', 'constraint', 'create',
    'cross', 'default', 'deferrable', 'desc', 'distinct', 'do', 'else', 'end',
    'except', 'false', 'fetch', 'for', 'foreign', 'from', 'full', 'grant', 'group',
    'having', 'in', 'initially', 'inner', 'intersect', 'into', 'is', 'join',
    'lateral', 'leading', 'left', 'like', 'limit', 'localtime', 'localtimestamp',
    'natural', 'not', 'null', 'offset', 'on', 'only', 'or', 'order', 'outer',
    'overlaps', 'placing', 'primary', 'references', 'returning', 'right', 'select',
    'session_user', 'similar', 'some', 'symmetric', 'table', 'then', 'to',
    'trailing', 'true', 'union', 'unique', 'user', 'using', 'variadic', 'verbose',
    'when', 'where', 'window', 'with',
]);

/**
 * Check if a sanitized macro name is a reserved SQL keyword that DuckDB cannot
 * use as a function/macro identifier.
 */
export function isReservedMacroName(sanitized: string): boolean {
    return DUCKDB_RESERVED_KEYWORDS.has(sanitized);
}

/**
 * Sanitize relation name for use as a macro name.
 * Converts "My Query!" -> "my_query" and MyQuery -> "myquery"
 */
export function sanitizeMacroName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')  // Replace non-alphanumeric chars with underscore
        .replace(/_+/g, '_')           // Collapse multiple underscores
        .replace(/^_|_$/g, '');        // Trim leading/trailing underscores
}

/**
 * Get the full macro name using the refs schema.
 * "My Query" -> "dash.refs.my_query"
 */
export function getMacroName(relationName: string): string {
    return `${DASH_CATALOG}.${DASH_REFS_SCHEMA}.${sanitizeMacroName(relationName)}`;
}

/**
 * Extract {{param}} placeholders from SQL.
 * Returns array of unique parameter names.
 */
export function extractParameters(sql: string): string[] {
    const regex = /{{([^}]+)}}/g;
    const matches = sql.matchAll(regex);
    const params = new Set<string>();

    for (const match of matches) {
        params.add(match[1].trim());
    }

    return Array.from(params);
}

/**
 * Escape single quotes in SQL for use in a string literal.
 */
function escapeSqlString(sql: string): string {
    return sql.replace(/'/g, "''");
}

/**
 * Format a default value for use in macro parameter definition.
 * Strings/dates are wrapped in single quotes, other types are not.
 */
function formatDefaultValue(param: ParameterDefinition): string {
    const value = param.defaultValue ?? '';
    if (param.type === 'string' || param.type === 'date') {
        return `'${escapeSqlString(value)}'`;
    }
    return value;
}

export async function generateCreateMacroSQLInternal(
    relationState: RelationState
): Promise<string> {
    let effectiveQuery = await ViewManager.instance.buildMacroQuery(relationState)
    const macroName = getMacroName(relationState.viewState.displayName);
    const paramNames = extractParameters(effectiveQuery);
    const createKeyword = isDatabaseReadonly() ? 'CREATE OR REPLACE TEMP MACRO' : 'CREATE OR REPLACE MACRO';

    if (paramNames.length === 0) {
        // No parameters - simple case
        const escapedQuery = escapeSqlString(effectiveQuery);
        return `${createKeyword} ${macroName}() AS TABLE (FROM query_result('${escapedQuery}'))`;
    } else {
        // Build parameter definitions map for quick lookup
        const paramDefMap = new Map<string, ParameterDefinition>();
        for (const p of relationState.viewState.parametersState?.parameters ?? []) {
            paramDefMap.set(p.name, p);
        }

        // Build parameter list with defaults: (p1, p2 := 'default')
        const paramListParts = paramNames.map(name => {
            const def = paramDefMap.get(name);
            if (def?.defaultValue) {
                return `${name} := ${formatDefaultValue(def)}`;
            }
            return name;
        });
        const paramList = paramListParts.join(', ');

        // Has parameters - use chained replace() to handle multiple occurrences
        const escapedTemplate = escapeSqlString(effectiveQuery);

        // Build nested replace() calls: replace(replace(template, '{{p1}}', p1::VARCHAR), '{{p2}}', p2::VARCHAR)
        let replaceExpr = `'${escapedTemplate}'`;
        for (const param of paramNames) {
            const escapedPlaceholder = `{{${param}}}`;
            replaceExpr = `replace(${replaceExpr}, '${escapedPlaceholder}', ${param}::VARCHAR)`;
        }

        return `${createKeyword} ${macroName}(${paramList}) AS TABLE (FROM query_result(${replaceExpr}))`;
    }
}

/**
 * Generate DROP MACRO SQL statement.
 */
export function generateDropMacroSQL(relationName: string): string {
    const macroName = getMacroName(relationName);
    return `DROP MACRO IF EXISTS ${macroName}`;
}

/**
 * Extract refs.xxx() macro references from SQL.
 * Returns the sanitized name parts (deduplicated).
 * Matches both "refs.name()" and "dash.refs.name()".
 *
 * "SELECT * FROM refs.employees(), refs.departments()" → ["employees", "departments"]
 */
export function extractMacroRefs(sqlRaw: string): string[] {
    const sql = removeComments(sqlRaw)
    const refs: string[] = [];
    const re = new RegExp(`(?:${DASH_CATALOG}\\.)?${DASH_REFS_SCHEMA}\\.(\\w+)\\s*\\(`, 'g');
    for (const match of sql.matchAll(re)) {
        refs.push(match[1]);
    }
    return [...new Set(refs)];
}

export interface MacroReference {
    relation: RelationWithOrigin;
    macroName: string;
}

/**
 * Build a regex that matches a macro name followed by '(' (with optional whitespace).
 * Ensures exact match: node_a() won't match node_ab().
 */
function macroCallRegex(macroName: string, flags: string = 'g'): RegExp {
    return new RegExp(`\\b${escapeRegExp(macroName)}\\s*\\(`, flags);
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if SQL contains an exact macro call (not a prefix match).
 */
export function sqlContainsMacroCall(sql: string, macroName: string): boolean {
    return macroCallRegex(macroName).test(sql);
}

/**
 * Find all relations whose SQL references the given macro name.
 * Searches across standalone relations, canvas nodes, and dashboard blocks.
 */
export function findMacroReferences(macroName: string, excludeId: string): MacroReference[] {
    const allRelations = getAllRelations();
    const references: MacroReference[] = [];

    for (const entry of allRelations) {
        if (entry.relation.id === excludeId) continue;
        const sql = entry.relation.query.baseQuery;
        if (sql && sqlContainsMacroCall(sql, macroName)) {
            references.push({relation: entry, macroName});
        }
    }

    return references;
}

export async function checkMacroName(_relationName: string): Promise<string | null> {
    return null;
}

/**
 * Register a relation as a table macro in DuckDB.
 * Uses TEMP macro if database is read-only.
 * Fails silently - macro registration is a convenience feature.
 */
export async function registerRelationMacro(
    relationState: RelationState
): Promise<void> {
    const sql = await generateCreateMacroSQLInternal(relationState);
    try {
        await ConnectionsService.getInstance().executeQuery(sql);
    } catch (error) {
        console.error(`Failed to register relation as table macro: ${relationState.viewState.displayName}`, error);
    }
}


/**
 * Drop a relation's table macro from DuckDB.
 * Fails silently - cleanup failures should not break the deletion flow.
 */
export async function dropRelationMacro(relationName: string): Promise<void> {
    const sql = generateDropMacroSQL(relationName);

    try {
        await ConnectionsService.getInstance().executeQuery(sql);
    } catch {
        // Silent fail
    }
}

/**
 * Handle relation actions for macro management.
 * Note: SQL editor already debounces onCodeChange (300ms), so no extra debouncing needed here.
 */
async function handleRelationAction(action: RelationEvent): Promise<void> {
    switch (action.type) {
        case 'CREATE':
        case 'UPDATE_SQL':
        case 'UPDATE_PARAMS':
        case 'UPDATE_SELECTION': {
            await registerRelationMacro(action.new!);
            break;
        }
        case 'DELETE':
            await dropRelationMacro(action.old!.viewState.displayName);
            break;
        case 'RENAME': {
            await dropRelationMacro(action.old!.viewState.displayName);
            await registerRelationMacro(action.new!);
            break;
        }
    }
    await useDatabaseState.getState().refresh(['structure']);
}

// Subscribe to relation actions
onRelationEvent(handleRelationAction);

/**
 * Re-register all existing relation macros.
 * Called when the database connection changes, since macros are not persistent across connections.
 */
/**
 * Build a dependency map for a set of macros.
 * For each key, returns the list of other keys it depends on (references in its SQL).
 * Only includes dependencies that exist in the provided set.
 */
export function buildMacroDependencies(macros: { key: string; createSql: string }[]): Map<string, string[]> {
    const allKeys = new Set(macros.map(m => m.key));
    const deps = new Map<string, string[]>();
    for (const {key, createSql} of macros) {
        const refs = extractMacroRefs(createSql).filter(ref => allKeys.has(ref) && ref !== key);
        deps.set(key, refs);
    }
    return deps;
}

/**
 * Topological sort of keys given a dependency map.
 * Returns keys ordered so that dependencies come before dependents.
 * Cycles are broken gracefully (the back-edge is skipped).
 */
export function topologicalSort(keys: string[], deps: Map<string, string[]>): string[] {
    const ordered: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(key: string) {
        if (visited.has(key)) return;
        if (visiting.has(key)) return; // cycle — break it
        visiting.add(key);
        for (const dep of deps.get(key) ?? []) {
            visit(dep);
        }
        visiting.delete(key);
        visited.add(key);
        ordered.push(key);
    }

    for (const key of keys) {
        visit(key);
    }

    return ordered;
}

/**
 * Order macro SQL statements so that dependencies are created first.
 * Returns CREATE MACRO statements in dependency order.
 */
export function orderMacroStatements(macros: { key: string; createSql: string }[]): string[] {
    const deps = buildMacroDependencies(macros);
    const ordered = topologicalSort(macros.map(m => m.key), deps);
    const sqlByKey = new Map(macros.map(m => [m.key, m.createSql]));
    return ordered.map(key => sqlByKey.get(key)!);
}

async function reregisterAllMacros(): Promise<void> {
    const entries = getAllRelations();

    const macros: { key: string; createSql: string }[] = [];
    for (const {relation} of entries) {
        if (relation.viewState.displayName && relation.query.baseQuery) {
            const key = sanitizeMacroName(relation.viewState.displayName);
            const createSql = await generateCreateMacroSQLInternal(relation);
            macros.push({key, createSql});
        }
    }

    const orderedSqls = orderMacroStatements(macros);
    for (const sql of orderedSqls) {
        try {
            await ConnectionsService.getInstance().executeQuery(sql);
        } catch (error) {
            console.error(`Failed to re-register relation macro: ${sql}`, error);
        }
    }
}

// Re-register all macros when the database connection changes
ConnectionsService.getInstance().onDatabaseConnectionChange(async (connection) => {
    if (connection) {
        const state = await connection.checkConnectionState();
        if (state.state === 'connected') {
            await reregisterAllMacros();
        }
    }
});
