import {TABLE_MACRO_PREFIX} from "@/platform/global-data";
import {ConnectionsService} from "@/state/connections/connections-service";
import {onRelationEvent, RelationEvent} from "../event/relation-events";
import {StateStorageInfoLoaded} from "@/model/database-connection";
import {ParameterDefinition} from "@/model/relation-view-state/parameters";
import {getAllRelations, RelationWithOrigin} from "@/state/relations/all-relation-utils";
import {removeComments} from "@/platform/sql-utils";
import {SelectionState} from "@/model/relation-view-state/selection";
import {buildSelectionFilteredQuery} from "@/state/relations/sql/selection-query";
import {useDatabaseState} from "@/state/database.state";

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
 * Get the full macro name with prefix.
 * "My Query" -> "node_my_query"
 */
export function getMacroName(relationName: string): string {
    return `${TABLE_MACRO_PREFIX}${sanitizeMacroName(relationName)}`;
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

/**
 * Generate CREATE MACRO SQL statement.
 *
 * For queries without parameters:
 *   CREATE OR REPLACE MACRO node_x() AS TABLE (FROM query_result('...'))
 *
 * For queries with parameters ({{param}}):
 *   CREATE OR REPLACE MACRO node_x(p1, p2 := 'default') AS TABLE (FROM query_result(replace(...)))
 *
 * Uses chained replace() instead of format() to handle parameters that appear multiple times.
 * Supports default parameter values from ParameterDefinition.
 *
 * @param relationName
 * @param baseQuery
 * @param paramDefs - Optional parameter definitions with default values
 * @param selection
 */
export function generateCreateMacroSQLInternal(
    relationName: string,
    baseQuery: string,
    paramDefs?: ParameterDefinition[],
    selection?: SelectionState
): string {
    const queryWithoutComments = removeComments(baseQuery);
    const effectiveQuery = buildSelectionFilteredQuery(queryWithoutComments, selection);
    const macroName = getMacroName(relationName);
    const paramNames = extractParameters(effectiveQuery);
    const createKeyword = isDatabaseReadonly() ? 'CREATE OR REPLACE TEMP MACRO' : 'CREATE OR REPLACE MACRO';

    if (paramNames.length === 0) {
        // No parameters - simple case
        const escapedQuery = escapeSqlString(effectiveQuery);
        return `${createKeyword} ${macroName}() AS TABLE (FROM query_result('${escapedQuery}'))`;
    } else {
        // Build parameter definitions map for quick lookup
        const paramDefMap = new Map<string, ParameterDefinition>();
        for (const p of paramDefs ?? []) {
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
 * Extract node_xxx() macro references from SQL.
 * Returns the sanitized name parts (deduplicated).
 *
 * "SELECT * FROM node_employees(), node_departments()" → ["employees", "departments"]
 */
export function extractMacroRefs(sqlRaw: string): string[] {
    const sql = removeComments(sqlRaw)
    const refs: string[] = [];
    const re = new RegExp(`\\b${TABLE_MACRO_PREFIX}(\\w+)\\s*\\(`, 'g');
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

/**
 * Rename a macro reference in SQL, replacing only the macro name, not its arguments.
 * E.g. "FROM node_old_name(x, y)" → "FROM node_new_name(x, y)"
 * Matches node_old_name followed by '(' to avoid prefix collisions.
 */
export function renameMacroInSql(sql: string, oldMacroName: string, newMacroName: string): string {
    // Match "node_old_name(" and replace only the name part, keeping "("
    const re = new RegExp(`\\b${escapeRegExp(oldMacroName)}(\\s*\\()`, 'g');
    return sql.replace(re, `${newMacroName}$1`);
}

/**
 * Rename all macro references across all relations (standalone, canvas, dashboard).
 * Only replaces the macro name itself, not its arguments.
 */
export function renameAllMacroReferences(oldMacroName: string, newMacroName: string, excludeId: string): void {
    for (const entry of getAllRelations()) {
        if (entry.relation.id === excludeId) continue;
        const sql = entry.relation.query.baseQuery;
        if (!sql || !sqlContainsMacroCall(sql, oldMacroName)) continue;
        const newSql = renameMacroInSql(sql, oldMacroName, newMacroName);
        if (newSql !== sql) {
            console.log(`Renaming macro reference in relation "${entry.relation.viewState.displayName}": ${oldMacroName} → ${newMacroName}`);

            entry.updateRelation({
                ...entry.relation,
                query: {...entry.relation.query, baseQuery: newSql},
            });
        }
    }
}

/**
 * Register a relation as a table macro in DuckDB.
 * Uses TEMP macro if database is read-only.
 * Fails silently - macro registration is a convenience feature.
 */
export async function registerRelationMacro(
    relationName: string,
    baseQuery: string,
    paramDefs?: ParameterDefinition[],
    selection?: SelectionState
): Promise<void> {
    const sql = generateCreateMacroSQLInternal(relationName, baseQuery,  paramDefs, selection);

    try {
        await ConnectionsService.getInstance().executeQuery(sql);
    } catch {
        // Silent fail - macro registration should not break the main flow
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
            const s = action.new!;
            await registerRelationMacro(s.viewState.displayName, s.query.baseQuery, s.viewState.parametersState?.parameters, s.viewState.selectionState);
            break;
        }
        case 'DELETE':
            await dropRelationMacro(action.old!.viewState.displayName);
            break;
        case 'RENAME': {
            await dropRelationMacro(action.old!.viewState.displayName);
            const s = action.new!;
            await registerRelationMacro(s.viewState.displayName, s.query.baseQuery, s.viewState.parametersState?.parameters, s.viewState.selectionState);
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
export function buildMacroDependencies(macros: { key: string; baseSql: string }[]): Map<string, string[]> {
    const allKeys = new Set(macros.map(m => m.key));
    const deps = new Map<string, string[]>();
    for (const { key, baseSql } of macros) {
        const refs = extractMacroRefs(baseSql).filter(ref => allKeys.has(ref) && ref !== key);
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
export function orderMacroStatements(macros: { key: string; baseSql: string; createSql: string }[]): string[] {
    const deps = buildMacroDependencies(macros);
    const ordered = topologicalSort(macros.map(m => m.key), deps);
    const sqlByKey = new Map(macros.map(m => [m.key, m.createSql]));
    return ordered.map(key => sqlByKey.get(key)!);
}

async function reregisterAllMacros(): Promise<void> {
    const entries = getAllRelations();

    const macros: { key: string; baseSql: string; createSql: string }[] = [];
    for (const { relation, origin } of entries) {
        if (origin === 'dashboard') continue;
        const name = relation.viewState.displayName;
        const baseSql = relation.query.baseQuery;
        const params = relation.viewState.parametersState?.parameters;
        const selection = relation.viewState.selectionState;
        if (name && baseSql) {
            const key = sanitizeMacroName(name);
            const createSql = generateCreateMacroSQLInternal(name, baseSql, params, selection);
            macros.push({ key, baseSql, createSql });
        }
    }

    const orderedSqls = orderMacroStatements(macros);
    const big_query = orderedSqls.join(';\n');
    await ConnectionsService.getInstance().executeQuery(big_query);
}

// Re-register all macros when the database connection changes
ConnectionsService.getInstance().onDatabaseConnectionChange((connection) => {
    if (connection) {
        reregisterAllMacros();
    }
});
