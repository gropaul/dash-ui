/**
 * What a replayed `sources.sql` statement left behind on the connection, and how to remove it again.
 *
 * A manifest is not only ATTACHes: it can materialise remote data into the session
 * (`CREATE TABLE memory.staging AS SELECT * FROM 's3://…'`), define views, or create secrets. All of
 * that lives on the connection rather than in the project's database files, so it survives a project
 * switch unless we undo it. Statements with no meaningful inverse (INSTALL / LOAD / SET) aren't
 * modelled.
 */

import {DASH_INTERNAL_CATALOGS} from "@/platform/global-data";
import {parseAttach} from "@/state/sources/sources-manifest";

export type SourceEffect =
    | { kind: 'attach'; target: string }
    | { kind: 'table'; target: string }
    | { kind: 'view'; target: string }
    | { kind: 'secret'; target: string };

const IDENT = String.raw`(?:"(?:[^"]|"")*"|[A-Za-z_]\w*)`;
const QUALIFIED = String.raw`${IDENT}(?:\.${IDENT}){0,2}`;

// CREATE [OR REPLACE] [TEMP|TEMPORARY] TABLE|VIEW [IF NOT EXISTS] <name> …
const CREATE_RE = new RegExp(
    String.raw`^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(TEMP\s+|TEMPORARY\s+)?(TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?(${QUALIFIED})`,
    'i',
);

// CREATE [OR REPLACE] [PERSISTENT|TEMPORARY] SECRET [IF NOT EXISTS] <name> ( … )
// anonymous secrets (`CREATE SECRET (TYPE s3, …)`) don't match - there is no name to drop
const SECRET_RE = new RegExp(
    String.raw`^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:PERSISTENT\s+|TEMPORARY\s+)?SECRET\s+(?:IF\s+NOT\s+EXISTS\s+)?(${IDENT})\s*\(`,
    'i',
);

/** The leading identifier of a (possibly qualified) name, unquoted and lower-cased. */
function catalogPart(name: string): string {
    const first = name.split('.')[0];
    const unquoted = first.startsWith('"') ? first.slice(1, -1).replace(/""/g, '"') : first;
    return unquoted.toLowerCase();
}

function isInternalCatalog(name: string): boolean {
    return DASH_INTERNAL_CATALOGS.includes(catalogPart(name));
}

/**
 * Classify a statement as a reversible effect, or null when there is nothing to undo.
 *
 * Objects inside the project's own catalogs are never recorded - those are separate database files
 * that get DETACHed on switch, so undoing them would delete the user's data instead of cleaning up.
 * That covers unqualified names too: the replay runs with the project's data database as the current
 * catalog (`USE dash_data` in loadProject), so an unqualified CREATE lands in that same file. TEMP
 * objects are the exception - they live in the session's `temp` catalog, so they are recorded fully
 * qualified, which keeps the DROP from resolving to a same-named project table.
 */
export function parseSourceEffect(statement: string): SourceEffect | null {
    const attach = parseAttach(statement);
    if (attach) {
        return isInternalCatalog(attach.alias) ? null : {kind: 'attach', target: attach.alias};
    }

    const secret = SECRET_RE.exec(statement);
    if (secret) return {kind: 'secret', target: secret[1]};

    const created = CREATE_RE.exec(statement);
    if (created) {
        const [, temp, keyword, name] = created;
        const kind = keyword.toLowerCase() === 'view' ? 'view' : 'table';
        const qualified = name.includes('.');
        if (temp) return qualified ? {kind, target: name} : {kind, target: `temp.main.${name}`};
        if (!qualified || isInternalCatalog(name)) return null;
        return {kind, target: name};
    }

    return null;
}

/** The statement that removes `effect` again; safe to run twice. */
export function undoStatement(effect: SourceEffect): string {
    switch (effect.kind) {
        case 'attach':
            return `DETACH DATABASE IF EXISTS ${effect.target};`;
        case 'table':
            return `DROP TABLE IF EXISTS ${effect.target};`;
        case 'view':
            return `DROP VIEW IF EXISTS ${effect.target};`;
        case 'secret':
            return `DROP SECRET IF EXISTS ${effect.target};`;
    }
}
