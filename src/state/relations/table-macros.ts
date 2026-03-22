import { TABLE_MACRO_PREFIX } from "@/platform/global-data";
import { ConnectionsService } from "@/state/connections/connections-service";
import { onRelationAction, RelationAction } from "./relation-actions";
import { StateStorageInfoLoaded } from "@/model/database-connection";

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
 * Converts "My Query!" -> "my_query"
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
 * Generate CREATE MACRO SQL statement.
 *
 * For queries without parameters:
 *   CREATE OR REPLACE MACRO node_x() AS TABLE (FROM query_result('...'))
 *
 * For queries with parameters ({{param}}):
 *   CREATE OR REPLACE MACRO node_x(p1, p2) AS TABLE (FROM query_result(format('...', p1, p2)))
 *
 * @param temporary - If true, creates a TEMP macro (for read-only databases)
 */
export function generateCreateMacroSQL(relationName: string, baseQuery: string, temporary: boolean = false): string {
    const macroName = getMacroName(relationName);
    const parameters = extractParameters(baseQuery);
    const createKeyword = temporary ? 'CREATE OR REPLACE TEMP MACRO' : 'CREATE OR REPLACE MACRO';

    if (parameters.length === 0) {
        // No parameters - simple case
        const escapedQuery = escapeSqlString(baseQuery);
        return `${createKeyword} ${macroName}() AS TABLE (FROM query_result('${escapedQuery}'))`;
    } else {
        // Has parameters - use format() function
        // Replace {{param}} with {} for format() placeholders
        let formatTemplate = baseQuery;
        for (const param of parameters) {
            formatTemplate = formatTemplate.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), '{}');
        }

        const escapedTemplate = escapeSqlString(formatTemplate);
        const paramList = parameters.join(', ');

        return `${createKeyword} ${macroName}(${paramList}) AS TABLE (FROM query_result(format('${escapedTemplate}', ${paramList})))`;
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
export async function registerRelationMacro(relationName: string, baseQuery: string): Promise<void> {
    const isReadonly = isDatabaseReadonly();
    const sql = generateCreateMacroSQL(relationName, baseQuery, isReadonly);

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
function handleRelationAction(action: RelationAction): void {
    switch (action.type) {
        case 'CREATE':
        case 'UPDATE_SQL':
            registerRelationMacro(action.relationName, action.sql);
            break;
        case 'DELETE':
            dropRelationMacro(action.relationName);
            break;
        case 'RENAME':
            dropRelationMacro(action.oldName);
            registerRelationMacro(action.relationName, action.sql);
            break;
    }
}

// Subscribe to relation actions
onRelationAction(handleRelationAction);
