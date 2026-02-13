'use strict';

const debug = require('debug')('sql-strip-comments');

// strip comments in sql
// one line comments: from "--" to end of line,
// or multiline: from "/*" to "*/".
// string literals with sql comments omited
// nested comments are not supported
// inspired: https://larrysteinle.com/2011/02/09/use-regular-expressions-to-clean-sql-statements/

function removeComments(sql: string) {
    sql = sql.replace(/("(""|[^"])*")|('(''|[^'])*')|(--[^\n\r]*)|(\/\*[\w\W]*?(?=\*\/)\*\/)/gm, (match) => {
        if (
            (match[0] === '"' && match[match.length - 1] === '"')
            || (match[0] === "'" && match[match.length - 1] === "'")
        ) return match;

        debug('comment removed: {\n%s\n}', match);
        return '';
    });

    return sql;
}

export function minifySQL(sql: string) {

    // first remove comments
    sql = removeComments(sql);

    // Remove all tabs and line breaks
    sql = sql.replace(/("(""|[^"])*")|('(''|[^'])*')|([\t\r\n])/gm, (match) => {
        if (
            (match[0] === '"' && match[match.length - 1] === '"')
            || (match[0] === "'" && match[match.length - 1] === "'")
        ) return match;

        return ' ';
    });

    // Reduce all duplicate spaces
    sql = sql.replace(/("(""|[^"])*")|('(''|[^'])*')|([ ]{2,})/gm, (match) => {
        if (
            (match[0] === '"' && match[match.length - 1] === '"')
            || (match[0] === "'" && match[match.length - 1] === "'")
        ) return match;

        return ' ';
    });


    return sql.trim();
}

export function splitSQL(sql: string, keepSemicolon: boolean = false): string[] {

    // remove comments first
    sql = removeComments(sql);

    const stmts: string[] = [];
    let current = '';

    enum State {
        Normal,
        SingleQuote,
        DoubleQuote,
        LineComment,
        BlockComment,
    }

    let state = State.Normal;

    for (let i = 0; i < sql.length; i++) {
        const ch = sql[i];
        const next = sql[i + 1];

        switch (state) {
            case State.Normal: {
                if (ch === "'") {
                    state = State.SingleQuote;
                    current += ch;
                } else if (ch === '"') {
                    state = State.DoubleQuote;
                    current += ch;
                } else if (ch === '-' && next === '-') {
                    state = State.LineComment;
                    current += ch;
                } else if (ch === '/' && next === '*') {
                    state = State.BlockComment;
                    current += ch;
                } else if (ch === ';') {
                    // statement boundary
                    if (keepSemicolon) {
                        current += ch;
                    }
                    if (current.trim().length > 0) {
                        stmts.push(current.trim());
                        current = '';
                    }
                } else {
                    current += ch;
                }
                break;
            }

            case State.SingleQuote: {
                current += ch;
                if (ch === "'" && next === "'") {
                    // Escaped quote: '' → stay in string, consume both
                    current += next;
                    i++;
                } else if (ch === "'") {
                    // End of string
                    state = State.Normal;
                }
                break;
            }

            case State.DoubleQuote: {
                current += ch;
                if (ch === '"' && next === '"') {
                    // Escaped double-quote: "" → stay in identifier
                    current += next;
                    i++;
                } else if (ch === '"') {
                    state = State.Normal;
                }
                break;
            }

            case State.LineComment: {
                current += ch;
                if (ch === '\n') {
                    state = State.Normal;
                }
                break;
            }

            case State.BlockComment: {
                current += ch;
                if (ch === '*' && next === '/') {
                    current += next;
                    i++;
                    state = State.Normal;
                }
                break;
            }
        }
    }

    if (current.trim().length > 0) {
        stmts.push(current.trim());
    }

    return stmts;
}


export function addSemicolonIfNeeded(sql: string): string {
    return sql.trim().endsWith(";") ? sql : sql + ";";
}

export function cleanAndSplitSQL(sql: string): string[] {
    return splitSQL(sql).map(addSemicolonIfNeeded).map(minifySQL);
}

// remove the semicolon at the end of the statement if it exists. This assumes only one statement is given
export function removeSemicolon(sql: string) {
    const splitted = splitSQL(sql);
    if (splitted.length === 0) {
        return sql;
    } else if (splitted.length > 1) {
        throw new Error("The SQL command must be a single statement.");
    } else {
        return splitted[0];
    }
}

// escape single quotes in the sql string for use in a string literal
export function escapeSQLForStringLiteral(sql: string): string {
    return sql.replace(/'/g, "''");
}

export function turnQueryIntoSubquery(sql: string, alias?: string): string {
    const statements = splitSQL(sql).map(minifySQL);

    // Ensure the SQL is a single statement
    if (statements.length !== 1) {
        console.error("SQL statements: ", statements);
        throw new Error("The SQL command must be a single statement.");
    }

    // Retrieve the cleaned single SQL statement
    const singleStatement = statements[0];

    if (!alias) {
        return `(${singleStatement})`;
    }

    // Validate the alias (simple validation for SQL-safe aliases)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
        throw new Error("Invalid alias name. Alias must be a valid SQL identifier.");
    }
    // Wrap the statement as a subquery
    return `(${singleStatement}) AS ${alias}`;

}
