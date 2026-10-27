import {Edge, MarkerType} from '@xyflow/react';
import {minifySQL} from "@/platform/sql-utils";
import {extractMacroRefs} from "@/state/relations/sql/table-macros";

/**
 * Extract node references from SQL.
 * Delegates to extractMacroRefs in table-macros.ts.
 */
export function extractNodeRefs(sql: string): string[] {
    return extractMacroRefs(sql);
}

/**
 * Create a new edge with standard styling.
 */
export function createAutoEdge(source: string, target: string): Edge {
    return {
        id: `sql-ref-${source}-${target}`,
        source,
        target,
        type: 'floating',
        markerEnd: {
            type: MarkerType.Arrow,
            width: 30,
            height: 30,
        },
    };
}

/**
 * Inject a node macro reference into SQL.
 * Simple string-based approach — designed to be replaced with AST-based
 * SQL manipulation in a future iteration.
 */
export function injectNodeRef(currentSql: string, macroName: string): string {
    const trimmed = currentSql.trim();

    // check if the macro name is already present in the SQL to avoid duplicate injection
    const sqlWithoutComments = minifySQL(trimmed);
    if (new RegExp(`\\b${macroName}\\s*\\(`).test(sqlWithoutComments)) {
        return currentSql; // already present, no injection needed
    }

    // Empty SQL: generate a full SELECT
    if (!trimmed) {
        return `SELECT * FROM ${macroName}()`;
    }

    // Check if SQL already contains a FROM clause (case-insensitive)
    const fromMatch = trimmed.match(/\bFROM\b/i);
    if (!fromMatch) {
        // No FROM: append FROM clause
        return `${trimmed}\nFROM ${macroName}()`;
    }

    // Has FROM: append comma-separated (cross join)
    // Find the position after the last table reference in the FROM clause
    // Simple approach: insert after the FROM keyword's first table expression
    // We'll find "FROM <something>" and append ", macroName()"
    const fromIndex = trimmed.search(/\bFROM\b/i);
    const afterFrom = trimmed.substring(fromIndex);

    // Find the end of the FROM clause (before WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, UNION, etc.)
    const clauseEnd = afterFrom.search(/\b(WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|UNION|INTERSECT|EXCEPT)\b/i);

    if (clauseEnd === -1) {
        // No subsequent clause — append at end
        return `${trimmed}, ${macroName}()`;
    } else {
        // Insert before the next clause
        const insertPos = fromIndex + clauseEnd;
        return `${trimmed.substring(0, insertPos)}, ${macroName}() ${trimmed.substring(insertPos)}`;
    }
}
