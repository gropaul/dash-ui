import {RelationState} from "@/model/relation-state";
import {cleanAndSplitSQL, removeSemicolon, sanitizeMacroName} from "@/platform/sql-utils";
import {replaceRefCalls} from "@/platform/sql-refs";

/**
 * Blocks of a page read each other through `refs.<name>()` without any macro in the database: when a block
 * runs, each such call naming another block of its page is replaced by that block's query, with its current
 * pick. A call naming no block of the page stays as it is and calls the macro of a project relation.
 */

export interface PageScope {
    /** The relations of the open page's blocks, keyed by id. */
    relations: () => Record<string, RelationState>;
    /** Renames a block of the page, and with `updateReferences` its refs in the other blocks. */
    rename: (relationId: string, name: string, updateReferences: boolean) => void;
}

const scopes = new Set<PageScope>();

export function addPageScope(scope: PageScope): () => void {
    scopes.add(scope);
    return () => scopes.delete(scope);
}

function scopeOf(relationId: string): { scope: PageScope, relations: Record<string, RelationState> } | undefined {
    for (const scope of scopes) {
        const relations = scope.relations();
        if (relations[relationId]) return {scope, relations};
    }
}

function pageOf(relationId: string): Record<string, RelationState> | undefined {
    return scopeOf(relationId)?.relations;
}

export function isPageBlock(relationId: string): boolean {
    return pageOf(relationId) !== undefined;
}

/** The other blocks of the block's page. */
export function otherPageBlocks(relationId: string): RelationState[] {
    return Object.values(pageOf(relationId) ?? {}).filter(r => r.id !== relationId);
}

export function renamePageBlock(relationId: string, name: string, updateReferences: boolean) {
    scopeOf(relationId)?.scope.rename(relationId, name, updateReferences);
}

/**
 * `sql` of the block `relationId` with the refs to other blocks of its page expanded, recursively; each
 * becomes a subquery built by `buildRefQuery` (the view's macro query, e.g. a dropdown's rows filtered to
 * its pick). Setup statements of the blocks read go before the query. A ref back to a block already being
 * expanded is left as it is.
 */
export async function expandPageRefs(
    relationId: string,
    sql: string,
    buildRefQuery: (relation: RelationState) => Promise<string>,
    expanding: Set<string> = new Set([relationId]),
): Promise<string> {
    const page = pageOf(relationId);
    if (!page) return sql;
    const byName = new Map<string, RelationState>();
    for (const relation of Object.values(page)) {
        const name = sanitizeMacroName(relation.viewState.displayName);
        if (!byName.has(name) && !expanding.has(relation.id)) byName.set(name, relation);
    }

    const used = new Set<string>();
    replaceRefCalls(sql, name => {
        if (byName.has(name)) used.add(name);
        return undefined;
    });
    if (used.size === 0) return sql;

    const setup: string[] = [];
    const subqueries = new Map<string, string>();
    for (const name of used) {
        const source = byName.get(name)!;
        const sourceSql = await expandPageRefs(source.id, source.query.baseQuery, buildRefQuery, new Set([...expanding, source.id]));
        const statements = cleanAndSplitSQL(await buildRefQuery({...source, query: {...source.query, baseQuery: sourceSql}}));
        setup.push(...statements.slice(0, -1));
        subqueries.set(name, `(${removeSemicolon(statements.at(-1) ?? '')})`);
    }
    return [...setup, replaceRefCalls(sql, name => subqueries.get(name))].join('\n');
}
