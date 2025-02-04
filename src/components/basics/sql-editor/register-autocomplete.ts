import {editor, languages, Position} from "monaco-editor";
import { Monaco } from "@monaco-editor/react";
import {
    Column,
    Database,
    getDatabaseFunctions,
    getDatabaseKeywords,
    getDatabaseStructure, Table
} from "@/components/basics/sql-editor/get-schema";
import {format} from "sql-formatter";


// Parse the SQL query to determine the context
function parseQueryContext(
    query: string,
    position: Position
): { database?: string; table?: string; isTypingDatabase: boolean } {
    const lines = query.split("\n");
    const currentLine = lines[position.lineNumber - 1].substring(
        0,
        position.column
    );
    const tokens = currentLine.split(/\s+/);

    let database: string | undefined;
    let table: string | undefined;
    let isTypingDatabase = false;

    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        if (token.includes(".")) {
            const parts = token.split(".");
            if (parts.length === 2 && parts[1] === "") {
                database = parts[0];
                isTypingDatabase = true;
                break;
            } else if (parts.length === 2) {
                [database, table] = parts;
            } else if (parts.length === 3) {
                [database, table] = parts.slice(0, 2);
            }
            break;
        }
        if (token.toLowerCase() === "from" && i + 1 < tokens.length) {
            table = tokens[i + 1];
            break;
        }
    }

    console.log('Context:', { database, table, isTypingDatabase });

    return { database, table, isTypingDatabase };
}


export function configureMonaco(monaco: Monaco) {

    // Register the SQL language
    monaco.languages.register({ id: "sql" });

    // Set language configuration for SQL
    monaco.languages.setLanguageConfiguration("sql", {
        brackets: [
            ["(", ")"],
            ["[", "]"],
        ],
        autoClosingPairs: [
            { open: "(", close: ")" },
            { open: "[", close: "]" },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
        ],
    });

    // Set monarch tokens provider for SQL syntax highlighting
    monaco.languages.setMonarchTokensProvider("sql", {
        keywords: [
            "SELECT",
            "FROM",
            "WHERE",
            "ORDER BY",
            "GROUP BY",
            "LIMIT",
            "JOIN",
            "INSERT",
            "UPDATE",
            "DELETE",
            "CREATE",
            "ALTER",
            "DROP",
            "TABLE",
            "INDEX",
            "VIEW",
            "TRIGGER",
            "PROCEDURE",
            "FUNCTION",
            "DATABASE",
        ],
        operators: [
            "=",
            ">",
            "<",
            "<=",
            ">=",
            "<>",
            "!=",
            "AND",
            "OR",
            "NOT",
            "LIKE",
            "IN",
            "BETWEEN",
        ],
        tokenizer: {
            root: [
                [
                    /[a-zA-Z_]\w*/,
                    { cases: { "@keywords": "keyword", "@default": "identifier" } },
                ],
                [/[<>!=]=?/, "operator"],
                [/[0-9]+/, "number"],
                [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
                [/'/, { token: "string.quote", bracket: "@open", next: "@string2" }],
                [/--.*$/, "comment"],
            ],
            string: [
                [/[^"]+/, "string"],
                [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            ],
            string2: [
                [/[^']+/, "string"],
                [/'/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            ],
            comment: [
                [/[^-]+/, "comment"],
                [/--/, "comment"],
            ],
        },
    });

    // Register completion item provider for SQL
    monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: async (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const dbStructure = await getDatabaseStructure();
            const queryContext = parseQueryContext(model.getValue(), position);
            const clickHouseFunctionsArray = await getDatabaseFunctions();
            const clickHouseKeywordsArray = await getDatabaseKeywords(); // Fetch keywords from API

            const suggestions: languages.CompletionItem[] = [];

            dbStructure.forEach((database: Database) => {
                if (
                    !queryContext.database ||
                    database.name
                        .toLowerCase()
                        .startsWith(queryContext.database.toLowerCase())
                ) {
                    if (queryContext.isTypingDatabase || !queryContext.database) {
                        suggestions.push({
                            label: `${database.name}`,
                            kind: monaco.languages.CompletionItemKind.Module,
                            insertText: `${database.name}`,
                            detail: "Database",
                            range: range,
                        });
                    }

                    if (
                        queryContext.isTypingDatabase ||
                        database.name === queryContext.database
                    ) {
                        database.children.forEach((table: Table) => {
                            if (
                                !queryContext.table ||
                                table.name
                                    .toLowerCase()
                                    .startsWith(queryContext.table.toLowerCase())
                            ) {
                                suggestions.push({
                                    label: `${table.name}`,
                                    kind: monaco.languages.CompletionItemKind.Struct,
                                    insertText: `${table.name}`,
                                    detail: `Table in ${database.name}`,
                                    range: range,
                                });

                                if (queryContext.table && table.name === queryContext.table) {
                                    table.children.forEach((column: Column) => {
                                        suggestions.push({
                                            label: `${column.name}`,
                                            kind: monaco.languages.CompletionItemKind.Field,
                                            insertText: `${column.name}`,
                                            detail: `${database.name}.${table.name}.${column.type}`,
                                            range: range,
                                        });
                                    });
                                }
                            }
                        });
                    }
                }
            });

            // Add SQL keyword suggestions from fetched keywords
            const keywordSuggestions = clickHouseKeywordsArray.map((keyword) => ({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                range: range,
            }));

            // Add ClickHouse functions suggestions
            const chFunctions = clickHouseFunctionsArray.map((chFunc: string) => ({
                label: chFunc,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${chFunc}()`,
                range: range,
            }));

            return {
                suggestions: [...suggestions, ...keywordSuggestions, ...chFunctions],
            };
        },
    });
}
