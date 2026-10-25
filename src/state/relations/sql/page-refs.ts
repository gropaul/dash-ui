import {RelationState} from "@/model/relation-state";
import {cleanAndSplitSQL, removeSemicolon} from "@/platform/sql-utils";
import {replaceRefCalls} from "@/platform/sql-refs";
import {pageOfSurface, surfacesOfPage} from "@/state/workspace/surfaces.state";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {queryByName} from "@/state/workspace/file-references";
import {blockNamesOf, sqlFences} from "@/state/workspace/page-text";
import {buildRelation, splitHeader} from "@/state/workspace/relation-config";
import {extractMacroRefs} from "@/state/relations/sql/table-macros";

/**
 * Blocks of a page read each other through `refs.<name>()` without any macro in the database: when a block
 * runs, each such call naming another block of its page is replaced by that block's query, with its current
 * pick. A call naming no block of the page stays as it is and calls the macro of a query file.
 */

/**
 * The relations of the page's blocks, by surface key: as shown, or for a block not on screen yet, as its fence
 * builds it. Only the blocks the page's text still has count; a removed block's state stays in memory a while.
 */
export function blocksOfPage(page: string): Record<string, RelationState> {
    const markdown = useWorkspace.getState().files[page] ?? '';
    const shown = surfacesOfPage(page);
    const blocks: Record<string, RelationState> = {};
    for (const relation of Object.values(shown)) {
        if (!relation.viewState.displayName) blocks[relation.id] = relation;
    }
    for (const {name, body} of sqlFences(markdown)) {
        if (!name) continue;
        const id = `${page}#${name}`;
        blocks[id] = shown[id] ?? buildRelation({id, name, ...splitHeader(body)});
    }
    return blocks;
}

/** The named blocks of the page `relationId` belongs to, by name; none for a query. */
function namedBlocksOf(relationId: string): Map<string, RelationState> {
    const page = pageOfSurface(relationId);
    const byName = new Map<string, RelationState>();
    if (!page) return byName;
    for (const relation of Object.values(blocksOfPage(page))) {
        const name = relation.viewState.displayName.toLowerCase();
        if (name) byName.set(name, relation);
    }
    return byName;
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
    const byName = new Map([...namedBlocksOf(relationId)].filter(([, relation]) => !expanding.has(relation.id)));
    if (byName.size === 0) return sql;

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

/** The `refs.<name>()` calls of `sql` that name neither a query file nor, for a block, a block of its page. */
export function missingRefs(relationId: string, sql: string): string[] {
    const files = useWorkspace.getState().files;
    const page = pageOfSurface(relationId);
    const blocks = blockNamesOf(page ? files[page] ?? '' : '');
    return extractMacroRefs(sql).filter(name => !blocks.has(name.toLowerCase()) && !queryByName(files, name));
}
