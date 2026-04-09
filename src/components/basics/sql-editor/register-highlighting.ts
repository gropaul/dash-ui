import {Monaco} from "@monaco-editor/react";
import {AstCache, AstHighlight, getOrComputeAst, offsetToMonacoPosition, walkAst} from "./register-ast-utils";
import {useDatabaseState} from "@/state/database.state";
import {binarySearchByName, normalizeIdentifier} from "@/components/basics/sql-editor/schema-utils";

// Highlights and caches stored per model URI so the global hover provider can read them
const modelHighlights = new Map<string, AstHighlight[]>();
const modelCaches = new Map<string, { current: AstCache }>();

// Hover provider is registered once globally for the SQL language
let hoverRegistered = false;

const MAX_COLUMNS_SHOWN = 25;

/** Format a column list as an aligned code block: "col_name    TYPE" */
function formatColumnList(columns: {name: string; type: string}[]): string {
    const shown = columns.slice(0, MAX_COLUMNS_SHOWN);
    const maxLen = Math.max(...shown.map(c => c.name.length), 0);
    const lines = shown.map(c => `${c.name.padEnd(maxLen + 2)}${c.type}`);
    if (columns.length > MAX_COLUMNS_SHOWN) {
        lines.push(`... and ${columns.length - MAX_COLUMNS_SHOWN} more`);
    }
    return '```\n' + lines.join('\n') + '\n```';
}

function ensureHoverRegistered(monaco: Monaco): void {
    if (hoverRegistered) return;
    hoverRegistered = true;

    monaco.languages.registerHoverProvider('sql', {
        provideHover: async (model, position) => {
            try {
                const uri = model.uri.toString();
                const sql = model.getValue();

                // Use the per-model cache; fall back to computing if this model isn't tracked yet
                if (!modelCaches.has(uri)) modelCaches.set(uri, {current: null});
                const cache = modelCaches.get(uri)!;
                const parsed = await getOrComputeAst(sql, cache);
                if (!parsed?.statements?.[0]?.node) return null;

                // Reuse already-computed highlights for this model if available
                let highlights = modelHighlights.get(uri);
                if (!highlights) {
                    highlights = [];
                    walkAst(parsed.statements[0].node, highlights, sql);
                }

                const lines = sql.split('\n');
                let cursorOffset = 0;
                for (let i = 0; i < position.lineNumber - 1; i++) cursorOffset += lines[i].length + 1;
                cursorOffset += position.column - 1;

                const match = highlights.find(h => cursorOffset >= h.startOffset && cursorOffset < h.startOffset + h.length);
                if (!match) return null;

                // Extract the full raw token from the SQL span (handles quoted identifiers
                // like "# Trains" that model.getWordAtPosition would truncate to just "Trains").
                // For TABLE_FUNCTION tokens the span includes "(args)" — strip it for lookup.
                const rawToken = sql.slice(match.startOffset, match.startOffset + match.length);
                const nameOnly = rawToken.replace(/\s*\(.*$/s, '');
                const tokenName = normalizeIdentifier(nameOnly);

                const start = offsetToMonacoPosition(sql, match.startOffset);
                const end = offsetToMonacoPosition(sql, match.startOffset + match.length);
                const range = {
                    startLineNumber: start.lineNumber,
                    endLineNumber: end.lineNumber,
                    startColumn: start.column,
                    endColumn: end.column,
                };

                if (match.kind === 'table') {
                    const table = useDatabaseState.getState().getTableByName(tokenName);

                    if (!table) return null;

                    const colCount = table.children.length;
                    const label = table.type === 'dash_node'
                        ? `**${table.displayName ?? table.name}** *(canvas node)*`
                        : `**${table.name}** — ${colCount} column${colCount !== 1 ? 's' : ''}`;

                    const contents: {value: string}[] = [{value: label}];

                    if (colCount > 0) {
                        contents.push({value: formatColumnList(table.children)});
                    }

                    if (table.type === 'dash_node' && table.query) {
                        const preview = table.query.trim().slice(0, 400);
                        contents.push({value: '```sql\n' + preview + (table.query.length > 400 ? '\n...' : '') + '\n```'});
                    }

                    return {range, contents};
                }

                if (match.kind === 'column') {
                    const {structure} = useDatabaseState.getState();
                    // Find all tables that have this column (binary search per table)
                    // Collect table names referenced in the current SQL from AST highlights
                    const referencedTableNames = new Set(
                        highlights
                            .filter(h => h.kind === 'table')
                            .map(h => normalizeIdentifier(sql.slice(h.startOffset, h.startOffset + h.length)))
                    );

                    const matches: {tableName: string; colName: string; type: string}[] = [];
                    for (const db of structure) {
                        for (const table of db.children) {
                            if (!referencedTableNames.has(table.escapedName)) continue;
                            const idx = binarySearchByName(table.children, tokenName);
                            if (idx !== -1) matches.push({tableName: table.name, colName: table.children[idx].name, type: table.children[idx].type});
                        }
                    }

                    if (matches.length === 1) {
                        return {range, contents: [{value: `**${matches[0].colName}** — \`${matches[0].type}\` · *${matches[0].tableName}*`}]};
                    }
                    if (matches.length > 1) {
                        const lines = matches.map(m => `${m.type.padEnd(16)}${m.tableName}`).join('\n');
                        return {
                            range,
                            contents: [
                                {value: `**${matches[0].colName}** — found in ${matches.length} tables`},
                                {value: '```\n' + lines + '\n```'},
                            ],
                        };
                    }
                    return {range, contents: [{value: `**${nameOnly}** — column found in ${matches.length} tables`}]};
                }

                return null;
            } catch {
                return null;
            }
        },
    });
}

export function registerHighlighting(editor: any, monaco: Monaco): void {
    ensureHoverRegistered(monaco);

    const uri = () => editor.getModel()?.uri.toString() as string | undefined;
    if (!modelCaches.has(uri()!)) modelCaches.set(uri()!, {current: null});
    const cache = modelCaches.get(uri()!)!;

    const decorationsCollection = editor.createDecorationsCollection([]);
    const hoverDecorationsCollection = editor.createDecorationsCollection([]);
    let lastHoveredHighlight: AstHighlight | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    async function updateHighlights(): Promise<void> {
        const sql: string = editor.getModel()?.getValue() ?? '';
        const key = uri();
        if (!sql.trim()) {
            decorationsCollection.set([]);
            if (key) modelHighlights.delete(key);
            return;
        }

        try {
            const parsed = await getOrComputeAst(sql, cache);
            if (!parsed?.statements?.[0]?.node) {
                decorationsCollection.set([]);
                if (key) modelHighlights.delete(key);
                return;
            }

            const highlights: AstHighlight[] = [];
            walkAst(parsed.statements[0].node, highlights, sql);
            if (key) modelHighlights.set(key, highlights);

            const decorations = highlights.map(h => {
                const start = offsetToMonacoPosition(sql, h.startOffset);
                const end = offsetToMonacoPosition(sql, h.startOffset + h.length);
                return {
                    range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                    options: {
                        inlineClassName: h.kind === 'table' ? 'sql-table-highlight' : 'sql-column-highlight',
                    },
                };
            });

            decorationsCollection.set(decorations);
        } catch {
            decorationsCollection.set([]);
            if (key) modelHighlights.delete(key);
        }
    }

    function applyHoverDecoration(match: AstHighlight | null): void {
        if (match === lastHoveredHighlight) return;
        lastHoveredHighlight = match;

        if (!match) {
            hoverDecorationsCollection.set([]);
            return;
        }

        const sql: string = editor.getModel()?.getValue() ?? '';
        const start = offsetToMonacoPosition(sql, match.startOffset);
        const end = offsetToMonacoPosition(sql, match.startOffset + match.length);
        hoverDecorationsCollection.set([{
            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
            options: {
                inlineClassName: match.kind === 'table'
                    ? 'sql-table-highlight-active'
                    : 'sql-column-highlight-active',
            },
        }]);
    }

    editor.onMouseMove((e: any) => {
        const position = e.target?.position;
        const highlights = uri() ? modelHighlights.get(uri()!) : undefined;
        if (!position || !highlights?.length) {
            applyHoverDecoration(null);
            return;
        }

        const sql: string = editor.getModel()?.getValue() ?? '';
        const lines = sql.split('\n');
        let offset = 0;
        for (let i = 0; i < position.lineNumber - 1; i++) offset += lines[i].length + 1;
        offset += position.column - 1;

        const match = highlights.find(h => offset >= h.startOffset && offset < h.startOffset + h.length) ?? null;
        applyHoverDecoration(match);
    });

    editor.onMouseLeave(() => applyHoverDecoration(null));

    editor.onDidChangeModelContent(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateHighlights, 500);
    });

    updateHighlights();
}
