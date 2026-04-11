import {escapeSQLForStringLiteral} from "@/platform/sql-utils";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DASH_CACHE_DATABASE_CATALOG} from "@/platform/global-data";

export interface AstHighlight {
    startOffset: number;
    length: number;
    kind: 'table' | 'column';
}

export type AstCache = { sql: string; ast: any } | null;

export function offsetToMonacoPosition(text: string, offset: number): { lineNumber: number; column: number } {
    const lines = text.split('\n');
    let remaining = offset;
    for (let i = 0; i < lines.length; i++) {
        if (remaining <= lines[i].length) {
            return {lineNumber: i + 1, column: remaining + 1};
        }
        remaining -= lines[i].length + 1; // +1 for \n
    }
    return {lineNumber: lines.length, column: lines[lines.length - 1].length + 1};
}

/**
 * Parse sql via DuckDB's json_serialize_sql, with caller-owned caching.
 * Pass a { current: AstCache } ref; it will be updated in place so each
 * call site (editor instance) keeps its own independent cache.
 */
export async function getOrComputeAst(sql: string, cache: { current: AstCache }): Promise<any> {
    if (cache.current && cache.current.sql === sql) {
        return cache.current.ast;
    }
    const escaped = escapeSQLForStringLiteral(sql);
    const query = `SELECT json_serialize_sql('${escaped}')::VARCHAR`;
    const result = await ConnectionsService.getInstance().executeQuery(query);
    const jsonStr = result.rows[0][0];
    const ast = JSON.parse(jsonStr);
    if (ast?.error === true) {
        throw new Error(ast.error_message ?? 'json_serialize_sql error');
    }
    cache.current = {sql, ast};
    return ast;
}

/** Find the offset of the matching closing ')' given the offset of the opening '('. */
function findClosingParen(sql: string, openOffset: number): number {
    let depth = 1;
    for (let i = openOffset + 1; i < sql.length; i++) {
        if (sql[i] === '(') depth++;
        else if (sql[i] === ')') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

/**
 * Simple recursive AST walker — extracts table and column highlight ranges.
 * Kept intentionally minimal; full AST coverage to be expanded later.
 */
export function walkAst(node: any, highlights: AstHighlight[], sql: string): void {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
        node.forEach(n => walkAst(n, highlights, sql));
        return;
    }

    // BASE_TABLE: highlight the table name identifier (skip internal cache views)
    if (node.type === 'BASE_TABLE' && node.table_name && node.query_location < Number.MAX_SAFE_INTEGER
        && node.catalog_name !== DASH_CACHE_DATABASE_CATALOG) {
        // query_location points to start of catalog.schema.table — skip catalog and schema prefixes
        let prefixLength = 0;
        if (node.catalog_name) prefixLength += node.catalog_name.length + 1; // "catalog."
        if (node.schema_name) prefixLength += node.schema_name.length + 1;   // "schema."
        highlights.push({startOffset: node.query_location + prefixLength, length: node.table_name.length, kind: 'table'});
    }

    // TABLE_FUNCTION: highlight function_name(params) including the argument list
    if (node.type === 'TABLE_FUNCTION' && node.function?.function_name && node.function.query_location < Number.MAX_SAFE_INTEGER) {
        const startOffset = node.function.query_location;
        const nameEnd = startOffset + node.function.function_name.length;
        const openParen = sql.indexOf('(', nameEnd);
        const closeParen = openParen !== -1 ? findClosingParen(sql, openParen) : -1;
        const length = closeParen !== -1 ? closeParen - startOffset + 1 : node.function.function_name.length;
        highlights.push({startOffset, length, kind: 'table'});
    }

    // COLUMN_REF: highlight the last (leaf) column name
    if (node.type === 'COLUMN_REF' && node.column_names?.length > 0 && node.query_location < Number.MAX_SAFE_INTEGER) {
        const colName = node.column_names[node.column_names.length - 1];
        // query_location points to start of qualifier.chain.colName — skip all qualifier prefixes
        const prefixLength = node.column_names.slice(0, -1).reduce((sum: number, n: string) => sum + n.length + 1, 0);
        const startOffset = node.query_location + prefixLength;
        // AST column_names store the unquoted name; if the SQL has a quoted identifier
        // (e.g. `"# Trains"`) the actual span is colName.length + 2 for the surrounding quotes
        const isQuoted = sql[startOffset] === '"';
        highlights.push({startOffset, length: isQuoted ? colName.length + 2 : colName.length, kind: 'column'});
    }

    // Recurse into all child values generically
    for (const value of Object.values(node)) {
        if (value && typeof value === 'object') {
            walkAst(value as any, highlights, sql);
        }
    }
}
