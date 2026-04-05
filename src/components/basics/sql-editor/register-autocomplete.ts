import {Monaco} from "@monaco-editor/react";
import {Column, Database, normalizeIdentifier, Table} from "@/components/basics/sql-editor/get-schema";
import {binarySearchByName, useDatabaseState} from "@/state/database.state";

function isKnownDatabase(structure: Database[], token: string): boolean {
    return binarySearchByName(structure, token) !== -1;
}

function findTableByName(structure: Database[], name: string): Table | undefined {
    for (const db of structure) {
        const idx = binarySearchByName(db.children, name);
        if (idx !== -1) return db.children[idx];
    }
    return undefined;
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
    for (const name of tableNames) {
        const t = findTableByName(structure, name);
        if (t) referencedTables.push(t);
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

    return {referencedTables, database, table, isTypingDatabase};
}

// ---------------------------------------------------------------------------
// Monaco configuration
// ---------------------------------------------------------------------------

let configured = false;

export function configureMonaco(monaco: Monaco) {
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

    monaco.languages.setMonarchTokensProvider("sql", {
        keywords: useDatabaseState.getState().keywords
            .filter(kw => kw.type ==='reserved')
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

    monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const {structure, functions, keywords, refresh} = useDatabaseState.getState();
            void refresh(); // keep cache warm for next call

            // Detect casing preference from the current word so suggestions match the user's style
            const currentWord = word.word;
            const upperCase = currentWord.length > 0 && currentWord === currentWord.toUpperCase();
            const adapt = (s: string) => upperCase ? s.toUpperCase() : s.toLowerCase();

            const ctx = parseQueryContext(model.getValue(), position, structure);
            const suggestions: any[] = [];

            // Columns from all tables referenced in this query (unqualified typing)
            if (!ctx.database && !ctx.table) {
                for (const table of ctx.referencedTables) {
                    for (const col of table.children) {
                        suggestions.push({
                            label: col.name,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: col.name,
                            sortText: `0_${col.name}`,
                            detail: `${col.type} · ${table.name}`,
                            range,
                        });
                    }
                }
            }

            const ctxDb = ctx.database ? normalizeIdentifier(ctx.database) : undefined;
            const ctxTable = ctx.table ? normalizeIdentifier(ctx.table) : undefined;

            structure.forEach((db: Database) => {
                if (!ctxDb || db.escapedName.startsWith(ctxDb)) {
                    // Suggest database names when no qualifier is typed yet
                    if (ctx.isTypingDatabase || !ctxDb) {
                        suggestions.push({
                            label: db.name,
                            kind: monaco.languages.CompletionItemKind.Module,
                            insertText: db.name,
                            sortText: `0_${db.escapedName}`,
                            detail: "Database",
                            range,
                        });
                    }

                    if (ctx.isTypingDatabase || db.escapedName === ctxDb) {
                        db.children.forEach((table: Table) => {
                            if (!ctxTable || table.escapedName.startsWith(ctxTable)) {
                                suggestions.push({
                                    label: table.name,
                                    kind: monaco.languages.CompletionItemKind.Struct,
                                    insertText: table.name,
                                    sortText: `0_${table.escapedName}`,
                                    detail: `Table in ${db.name}`,
                                    range,
                                });

                                if (ctxTable && table.escapedName === ctxTable) {
                                    table.children.forEach((col: Column) => {
                                        suggestions.push({
                                            label: col.name,
                                            kind: monaco.languages.CompletionItemKind.Field,
                                            insertText: col.name,
                                            sortText: `0_${col.escapedName}`,
                                            detail: `${table.name} · ${col.type}`,
                                            range,
                                        });
                                    });
                                }
                            }
                        });
                    }
                }
            });

            const keywordSuggestions = keywords.map((kw) => ({
                label: adapt(kw.name),
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: adapt(kw.name),
                sortText: `1_${kw.name}`,
                range,
            }));

            const functionSuggestions = functions.map((fn) => ({
                label: adapt(fn.name),
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${adapt(fn.name)}()`,
                sortText: `2_${fn.name}`,
                range,
            }));

            return {suggestions: [...suggestions, ...keywordSuggestions, ...functionSuggestions]};
        },
    });
}
