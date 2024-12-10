
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

function minifySQL(sql: string) {
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



/**
 * Separates SQL statements by the semicolon delimiter.
 * @param sql The SQL string containing multiple statements.
 * @returns An array of individual SQL statements.
 */
export function getSeparatedStatements(sql: string): string[] {
    // Split by semicolon, trim whitespace, and filter out empty strings
    return removeComments(sql)
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);
}


export function addSemicolonIfNeeded(sql: string): string {
    return sql.trim().endsWith(";") ? sql : sql + ";";
}

export function cleanAndSplitSQL(sql: string): string[] {
    return getSeparatedStatements(sql).map(addSemicolonIfNeeded).map(minifySQL);
}

export function turnQueryIntoSubquery(sql: string, alias?: string): string {
    const statements = getSeparatedStatements(sql).map(minifySQL);

    // Ensure the SQL is a single statement
    if (statements.length !== 1) {
        console.error("SQL statements: ", statements);
        throw new Error("The SQL command must be a single statement.");
    }

    // Retrieve the cleaned single SQL statement
    const singleStatement = statements[0];

    // remove the semicolon at the end of the statement
    const cleanedStatement = singleStatement.trim().replace(/;$/, "");

    if (!alias) {
        return `(${cleanedStatement})`;
    }

    // Validate the alias (simple validation for SQL-safe aliases)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
        throw new Error("Invalid alias name. Alias must be a valid SQL identifier.");
    }
    // Wrap the statement as a subquery
    return `(${cleanedStatement}) AS ${alias}`;

}
