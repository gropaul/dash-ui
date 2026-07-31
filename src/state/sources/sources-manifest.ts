/**
 * The per-project data-sources manifest is a plain-SQL file (`sources.sql`) that is the single
 * source of truth for what a project attaches/loads on open. This module is the small, forgiving
 * parser + builder the List view uses to render rows and append new sources. Statements it doesn't
 * recognize round-trip verbatim (they're only editable in the SQL view).
 */

/** A recognized `ATTACH` statement, broken into the parts the list renders. */
export interface ParsedAttach {
    path: string;
    alias: string;
    readonly: boolean;
}

// ATTACH [IF NOT EXISTS] '<path>' AS <alias|"alias"> [(READ_ONLY | READ_WRITE)]
const ATTACH_RE = /^\s*ATTACH\s+(?:IF\s+NOT\s+EXISTS\s+)?'([^']+)'\s+AS\s+"?([A-Za-z_][\w]*)"?\s*(\([^)]*\))?\s*;?\s*$/i;

/** Parse a single statement as an ATTACH; null if it isn't one we recognize. */
export function parseAttach(statement: string): ParsedAttach | null {
    const m = ATTACH_RE.exec(statement);
    if (!m) return null;
    return {
        path: m[1],
        alias: m[2],
        readonly: /READ_ONLY/i.test(m[3] ?? ""),
    };
}

/** Build an ATTACH statement for the manifest (uses IF NOT EXISTS so replay is idempotent). */
export function buildAttachStatement(path: string, alias: string, readonly: boolean): string {
    const clause = readonly ? " (READ_ONLY)" : "";
    return `ATTACH IF NOT EXISTS '${path}' AS ${alias}${clause};`;
}

/** Append a statement to an existing manifest, keeping a single trailing newline. */
export function appendStatement(manifest: string, statement: string): string {
    const trimmed = manifest.replace(/\s+$/, "");
    return (trimmed ? trimmed + "\n" : "") + statement + "\n";
}

/** Derive a safe DuckDB alias from a file path or URL (basename, sans extension). */
export function aliasFromPath(path: string): string {
    const base = path.split(/[\\/]/).pop() ?? path;
    const noExt = base.replace(/\.[^.]+$/, "");
    const cleaned = noExt.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(\d)/, "_$1");
    return cleaned || "db";
}
