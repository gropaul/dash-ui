import { TABLE_MACRO_PREFIX } from "@/platform/global-data";
import { ConnectionsService } from "@/state/connections/connections-service";
import { onRelationEvent, RelationEvent } from "../event/relation-events";
import { StateStorageInfoLoaded } from "@/model/database-connection";
import { ParameterDefinition } from "@/model/relation-view-state/parameters";
import { getAllRelations } from "@/state/relations/all-relation-utils";

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
 * @param temporary - If true, creates a TEMP macro (for read-only databases)
 * @param paramDefs - Optional parameter definitions with default values
 */
export function generateCreateMacroSQL(
    relationName: string,
    baseQuery: string,
    temporary: boolean = false,
    paramDefs?: ParameterDefinition[]
): string {
    const macroName = getMacroName(relationName);
    const paramNames = extractParameters(baseQuery);
    const createKeyword = temporary ? 'CREATE OR REPLACE TEMP MACRO' : 'CREATE OR REPLACE MACRO';

    if (paramNames.length === 0) {
        // No parameters - simple case
        const escapedQuery = escapeSqlString(baseQuery);
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
        const escapedTemplate = escapeSqlString(baseQuery);

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
 * Register a relation as a table macro in DuckDB.
 * Uses TEMP macro if database is read-only.
 * Fails silently - macro registration is a convenience feature.
 */
export async function registerRelationMacro(
    relationName: string,
    baseQuery: string,
    paramDefs?: ParameterDefinition[]
): Promise<void> {
    const isReadonly = isDatabaseReadonly();
    const sql = generateCreateMacroSQL(relationName, baseQuery, isReadonly, paramDefs);

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
function handleRelationAction(action: RelationEvent): void {
    switch (action.type) {
        case 'CREATE':
            registerRelationMacro(action.relationName, action.sql, action.parameters);
            break;
        case 'UPDATE_SQL':
            registerRelationMacro(action.relationName, action.sql, action.parameters);
            break;
        case 'UPDATE_PARAMS':
            registerRelationMacro(action.relationName, action.sql, action.parameters);
            break;
        case 'DELETE':
            dropRelationMacro(action.relationName);
            break;
        case 'RENAME':
            dropRelationMacro(action.oldName);
            registerRelationMacro(action.relationName, action.sql, action.parameters);
            break;
    }
}

// Subscribe to relation actions
onRelationEvent(handleRelationAction);

/**
 * Re-register all existing relation macros.
 * Called when the database connection changes, since macros are not persistent across connections.
 */
async function reregisterAllMacros(): Promise<void> {
    const entries = getAllRelations();
    for (const { relation, origin } of entries) {
        if (origin === 'dashboard') continue;
        const name = relation.viewState.displayName;
        const sql = relation.query.baseQuery;
        const params = relation.viewState.parametersState?.parameters;
        if (name && sql) {
            await registerRelationMacro(name, sql, params);
        }
    }
}

// Re-register all macros when the database connection changes
ConnectionsService.getInstance().onDatabaseConnectionChange((connection) => {
    if (connection) {
        reregisterAllMacros();
    }
});
