import {DASH_CATALOG_STATE, DASH_REFS_SCHEMA} from "@/platform/global-data";

// `refs.<name>()` or `dash.refs.<name>()`: the prefix, the name, and (for REF_CALL) the empty argument list.
const REF_CALL = new RegExp(`(?:${DASH_CATALOG_STATE}\\.)?${DASH_REFS_SCHEMA}\\.(\\w+)\\s*\\(\\s*\\)`, 'iy');
const REF_NAME = new RegExp(`((?:${DASH_CATALOG_STATE}\\.)?${DASH_REFS_SCHEMA}\\.)(\\w+)(?=\\s*\\()`, 'iy');

/**
 * `sql` with each match of the sticky `pattern` for which `replace` returns a string replaced by it. Matches
 * inside string literals, quoted identifiers and comments, and ones following a name (`x.refs.a()`), are left alone.
 */
function replaceMatches(sql: string, pattern: RegExp, replace: (match: RegExpExecArray) => string | undefined): string {
    let out = '';
    let i = 0;
    while (i < sql.length) {
        const char = sql[i];
        const skipTo = char === "'" || char === '"' ? closingQuote(sql, i)
            : sql.startsWith('--', i) ? lineEnd(sql, i)
            : sql.startsWith('/*', i) ? blockCommentEnd(sql, i)
            : undefined;
        if (skipTo !== undefined) {
            out += sql.slice(i, skipTo);
            i = skipTo;
            continue;
        }
        pattern.lastIndex = i;
        const match = /[\w.]/.test(sql[i - 1] ?? '') ? null : pattern.exec(sql);
        const replacement = match ? replace(match) : undefined;
        if (match && replacement !== undefined) {
            out += replacement;
            i += match[0].length;
        } else {
            out += char;
            i++;
        }
    }
    return out;
}

function closingQuote(sql: string, start: number): number {
    const quote = sql[start];
    let i = start + 1;
    while (i < sql.length) {
        if (sql[i] === quote) {
            if (sql[i + 1] !== quote) return i + 1;
            i++;
        }
        i++;
    }
    return sql.length;
}

function lineEnd(sql: string, start: number): number {
    const end = sql.indexOf('\n', start);
    return end === -1 ? sql.length : end;
}

function blockCommentEnd(sql: string, start: number): number {
    const end = sql.indexOf('*/', start + 2);
    return end === -1 ? sql.length : end + 2;
}

/** `sql` with each argument-less `refs.<name>()` call for which `replace` returns a string replaced by it. */
export function replaceRefCalls(sql: string, replace: (name: string) => string | undefined): string {
    return replaceMatches(sql, REF_CALL, match => replace(match[1].toLowerCase()));
}

/** `sql` with the calls of `refs.<from>(…)` renamed to `refs.<to>(…)`, keeping their prefix and arguments. */
export function renameRefCalls(sql: string, from: string, to: string): string {
    return replaceMatches(sql, REF_NAME, match => match[2].toLowerCase() === from ? match[1] + to : undefined);
}

/** Whether `sql` calls `refs.<name>(…)`. */
export function callsRef(sql: string, name: string): boolean {
    return renameRefCalls(sql, name, `${name}_`) !== sql;
}
