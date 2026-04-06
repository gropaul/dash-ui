import {Monaco} from "@monaco-editor/react";
import {
    binarySearchByName,
    Column,
    Database,
    normalizeIdentifier,
    Table
} from "@/components/basics/sql-editor/schema-utils";
import {useDatabaseState} from "@/state/database.state";

function isKnownDatabase(structure: Database[], token: string): boolean {
    return binarySearchByName(structure, token) !== -1;
}

// ---------------------------------------------------------------------------
// Comment stripping — replaces comment text with spaces to preserve offsets
// ---------------------------------------------------------------------------

export function stripComments(sql: string): string {
    let out = '';
    let i = 0;
    while (i < sql.length) {
        // Single-line comment: -- …
        if (sql[i] === '-' && sql[i + 1] === '-') {
            while (i < sql.length && sql[i] !== '\n') { out += ' '; i++; }
        }
        // Multi-line comment: /* … */
        else if (sql[i] === '/' && sql[i + 1] === '*') {
            out += '  '; i += 2;
            while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
                out += sql[i] === '\n' ? '\n' : ' '; i++;
            }
            if (i < sql.length) { out += '  '; i += 2; }
        }
        // String literal — skip contents so keywords inside strings are ignored
        else if (sql[i] === "'" || sql[i] === '"') {
            const q = sql[i]; out += q; i++;
            while (i < sql.length && sql[i] !== q) {
                out += sql[i] === '\n' ? '\n' : ' '; i++;
            }
            if (i < sql.length) { out += q; i++; }
        }
        else { out += sql[i]; i++; }
    }
    return out;
}

// ---------------------------------------------------------------------------
// Query context
// ---------------------------------------------------------------------------

const FROM_JOIN_RE = /\b(?:FROM|JOIN)\s+([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)/gi;
const STOP_WORD_RE = /^(?:WHERE|GROUP|HAVING|ORDER|LIMIT|ON|SET|UNION|INTERSECT|EXCEPT|SELECT|WITH)$/i;

/** Extract all unique table-name tokens that follow FROM or JOIN keywords. */
export function extractReferencedTableNames(cleanSql: string): string[] {
    const names = new Set<string>();
    let m: RegExpExecArray | null;
    FROM_JOIN_RE.lastIndex = 0;
    while ((m = FROM_JOIN_RE.exec(cleanSql)) !== null) {
        const parts = m[1].split('.');
        const tableName = parts[parts.length - 1];
        if (tableName && !STOP_WORD_RE.test(tableName)) names.add(tableName);
    }
    return [...names];
}

interface QueryContext {
    /** Tables actually referenced in the full SQL (resolved from structure). */
    referencedTables: Table[];
    /** Escaped names of databases that own at least one referenced table. */
    referencedDatabases: Set<string>;
    /** Database token being typed at the cursor (e.g. `mydb.` → `mydb`). */
    database?: string;
    /** Table token the cursor is inside (e.g. `mydb.orders` → `orders`). */
    table?: string;
    /** True when cursor is right after a `db.` separator. */
    isTypingDatabase: boolean;
}

function parseQueryContext(query: string, position: any, structure: Database[]): QueryContext {
    const clean = stripComments(query);

    // Resolve all FROM/JOIN table references against the known structure
    const tableNames = extractReferencedTableNames(clean);
    const referencedTables: Table[] = [];
    const referencedDatabases = new Set<string>();
    for (const name of tableNames) {
        for (const db of structure) {
            const idx = binarySearchByName(db.children, name);
            if (idx !== -1) {
                referencedTables.push(db.children[idx]);
                referencedDatabases.add(db.escapedName);
                break;
            }
        }
    }

    // Determine what the user is actively typing at the cursor
    const lines = clean.split('\n');
    const currentLine = (lines[position.lineNumber - 1] ?? '').substring(0, position.column);
    const tokens = currentLine.split(/[\s,]+/).filter(Boolean);

    let database: string | undefined;
    let table: string | undefined;
    let isTypingDatabase = false;

    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];

        if (token.includes('.')) {
            const parts = token.split('.');
            const last = parts[parts.length - 1];
            if (last === '') {
                // Typed "something." — check via binary search if it's a known database
                const prefix = parts[0];
                if (isKnownDatabase(structure, prefix)) {
                    database = prefix;
                    isTypingDatabase = true;
                }
            } else if (parts.length === 2) {
                [database, table] = parts;
            } else if (parts.length >= 3) {
                [database, table] = [parts[0], parts[1]];
            }
            break;
        }

        if (/^(?:FROM|JOIN)$/i.test(token) && i + 1 < tokens.length) {
            table = tokens[i + 1];
            break;
        }
    }

    return {referencedTables, referencedDatabases, database, table, isTypingDatabase};
}

// ---------------------------------------------------------------------------
// Suggestion relevance levels
// ---------------------------------------------------------------------------

type SuggestionLevel = 'current' | 'referenced' | 'other';

function levelRank(level: SuggestionLevel): '1' | '2' | '3' {
    if (level === 'current') return '1';
    if (level === 'referenced') return '2';
    return '3';
}

function makeSortText(level: SuggestionLevel, name: string): string {
    return `${levelRank(level)}_${name}`;
}

function getDatabaseLevel(db: Database, ctx: QueryContext): SuggestionLevel {
    if (ctx.database && db.escapedName === normalizeIdentifier(ctx.database)) return 'current';
    if (ctx.referencedDatabases.has(db.escapedName)) return 'referenced';
    return 'other';
}

function getTableLevel(table: Table, ctx: QueryContext): SuggestionLevel {
    if (ctx.table && table.escapedName === normalizeIdentifier(ctx.table)) return 'current';
    if (ctx.referencedTables.includes(table)) return 'referenced';
    return 'other';
}

function getColumnLevel(table: Table, ctx: QueryContext): SuggestionLevel {
    if (ctx.table && table.escapedName === normalizeIdentifier(ctx.table)) return 'current';
    if (ctx.referencedTables.includes(table)) return 'referenced';
    return 'other';
}

// ---------------------------------------------------------------------------
// Suggestion builders
// ---------------------------------------------------------------------------

function buildColumnSuggestions(
    table: Table,
    level: SuggestionLevel,
    range: any,
    monaco: Monaco,
): any[] {
    return table.children.map((col: Column) => ({
        label: col.name,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: col.name,
        filterText: col.escapedName,
        sortText: makeSortText(level, col.escapedName),
        detail: `${col.type} · ${table.name}`,
        range,
    }));
}

function buildTableSuggestions(
    db: Database,
    ctx: QueryContext,
    range: any,
    monaco: Monaco,
): any[] {
    const ctxTable = ctx.table ? normalizeIdentifier(ctx.table) : undefined;
    const suggestions: any[] = [];

    for (const table of db.children) {
        if (ctxTable && !table.escapedName.startsWith(ctxTable)) continue;

        const tableLevel = getTableLevel(table, ctx);
        suggestions.push({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Struct,
            insertText: table.type == 'dash_node' ? table.name + "()": table.name,
            filterText: table.escapedName,
            sortText: makeSortText(tableLevel, table.escapedName),
            detail: `Table in ${db.name}`,
            range,
        });

        // Also expand columns when this table is the active typing target
        if (ctxTable && table.escapedName === ctxTable) {
            suggestions.push(...buildColumnSuggestions(table, 'current', range, monaco));
        }
    }

    return suggestions;
}

function buildDatabaseSuggestions(
    structure: Database[],
    ctx: QueryContext,
    range: any,
    monaco: Monaco,
): any[] {
    const ctxDb = ctx.database ? normalizeIdentifier(ctx.database) : undefined;
    const suggestions: any[] = [];

    for (const db of structure) {
        if (ctxDb && !db.escapedName.startsWith(ctxDb)) continue;

        const dbLevel = getDatabaseLevel(db, ctx);

        if (ctx.isTypingDatabase || !ctxDb) {
            suggestions.push({
                label: db.name,
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: db.name,
                filterText: db.escapedName,
                sortText: makeSortText(dbLevel, db.escapedName),
                detail: 'Database',
                range,
            });
        }

        suggestions.push(...buildTableSuggestions(db, ctx, range, monaco));
    }

    return suggestions;
}

function buildReferencedColumnSuggestions(
    ctx: QueryContext,
    range: any,
    monaco: Monaco,
): any[] {
    const suggestions: any[] = [];
    for (const table of ctx.referencedTables) {
        const level = getColumnLevel(table, ctx);
        suggestions.push(...buildColumnSuggestions(table, level, range, monaco));
    }
    return suggestions;
}

function buildKeywordSuggestions(
    keywords: {name: string}[],
    adapt: (s: string) => string,
    range: any,
    monaco: Monaco,
): any[] {
    return keywords.map((kw) => ({
        label: adapt(kw.name),
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: adapt(kw.name),
        sortText: `4_${kw.name}`,
        range,
    }));
}

function buildFunctionSuggestions(
    functions: {name: string}[],
    adapt: (s: string) => string,
    range: any,
    monaco: Monaco,
): any[] {
    return functions.map((fn) => ({
        label: adapt(fn.name),
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `${adapt(fn.name)}()`,
        sortText: `5_${fn.name}`,
        range,
    }));
}

// ---------------------------------------------------------------------------
// Monaco configuration
// ---------------------------------------------------------------------------

let configured = false;

export function refreshMonacoTokenizer(monaco: Monaco) {
    monaco.languages.setMonarchTokensProvider("sql", {
        keywords: useDatabaseState.getState().keywords
            .filter(kw => kw.type === 'reserved')
            .map(kw => kw.name),
        operators: ["=", ">", "<", "<=", ">=", "<>", "!=", "AND", "OR", "NOT", "LIKE", "IN", "BETWEEN"],
        tokenizer: {
            root: [
                [/[a-zA-Z_]\w*/, {cases: {"@keywords": "keyword", "@default": "identifier"}}],
                [/[<>!=]=?/, "operator"],
                [/[0-9]+/, "number"],
                [/"/, {token: "string.quote", bracket: "@open", next: "@string"}],
                [/'/, {token: "string.quote", bracket: "@open", next: "@string2"}],
                [/--.*$/, "comment"],
            ],
            string: [[/[^"]+/, "string"], [/"/, {token: "string.quote", bracket: "@close", next: "@pop"}]],
            string2: [[/[^']+/, "string"], [/'/, {token: "string.quote", bracket: "@close", next: "@pop"}]],
            comment: [[/[^-]+/, "comment"], [/--/, "comment"]],
        },
    });
}

export function registerCompletionDuckDB(monaco: Monaco) {
    if (configured) return;
    configured = true;

    monaco.languages.register({id: "sql"});

    monaco.languages.setLanguageConfiguration("sql", {
        brackets: [["(", ")"], ["[", "]"]],
        autoClosingPairs: [
            {open: "(", close: ")"},
            {open: "[", close: "]"},
            {open: '"', close: '"'},
            {open: "'", close: "'"},
        ],
    });

    monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const {structure, functions, keywords} = useDatabaseState.getState();

            const currentWord = word.word;
            const upperCase = currentWord.length > 0 && currentWord === currentWord.toUpperCase();
            const adapt = (s: string) => upperCase ? s.toUpperCase() : s.toLowerCase();

            const ctx = parseQueryContext(model.getValue(), position, structure);

            const suggestions: any[] = [
                // Unqualified column typing — columns from referenced tables
                ...(!ctx.database && !ctx.table ? buildReferencedColumnSuggestions(ctx, range, monaco) : []),
                // Databases and their tables/columns
                ...buildDatabaseSuggestions(structure, ctx, range, monaco),
                // Keywords and functions
                ...buildKeywordSuggestions(keywords, adapt, range, monaco),
                ...buildFunctionSuggestions(functions, adapt, range, monaco),
            ];

            return {suggestions};
        },
    });
}
