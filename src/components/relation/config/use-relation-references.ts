import {useMemo} from "react";
import {RelationState} from "@/model/relation-state";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {queriesCalledBy, usersOf} from "@/state/workspace/file-references";
import {pageOfSurface} from "@/state/workspace/surfaces.state";
import {sqlFences} from "@/state/workspace/page-text";
import {viewOfQuery} from "@/state/workspace/relation-config";
import {callsRef} from "@/platform/sql-refs";
import {fileIconType} from "@/components/workspace/file-icon";
import {displayName, kindOf} from "@/state/workspace/workspace-tree";

export interface ReferenceEntry {
    /** The file's path, or the called name when no query has it. */
    id: string;
    name: string;
    /** Icon key for `defaultIconFactory`: a view type or 'dashboards'. */
    iconType: string;
    /** Secondary text on the right of the row. */
    detail?: string;
    /** False for a name no query has. */
    navigable: boolean;
}

export interface RelationReferences {
    /** Queries whose SQL calls this query's `refs.<name>()`. */
    usedByRelations: ReferenceEntry[];
    /** Queries this one's SQL calls. */
    usesRelations: ReferenceEntry[];
    /** Pages calling this query or taking it in. */
    pages: ReferenceEntry[];
}

function fileEntry(path: string): ReferenceEntry {
    const kind = kindOf(path);
    return {id: path, name: displayName(path), iconType: fileIconType({kind, path}), navigable: true};
}

/** Another block of the page; it is on screen already, so not a link. */
function blockEntry(page: string, name: string, body: string): ReferenceEntry {
    return {id: `${page}#${name}`, name, iconType: viewOfQuery(body), detail: 'block', navigable: false};
}

/** The blocks of `page` calling the block `name`, and what the block's `sql` calls: blocks of the page, then queries. */
function blockReferences(files: Record<string, string>, page: string, name: string, sql: string): RelationReferences {
    const fences = sqlFences(files[page] ?? '').filter((f): f is { name: string, body: string } => !!f.name);
    const byName = new Map(fences.map(f => [f.name.toLowerCase(), f]));
    const self = name.toLowerCase();
    return {
        usedByRelations: fences.filter(f => f.name.toLowerCase() !== self && callsRef(f.body, self))
            .map(f => blockEntry(page, f.name, f.body)),
        usesRelations: queriesCalledBy(files, sql).map(({name, path}) => {
            const block = byName.get(name.toLowerCase());
            if (block) return blockEntry(page, block.name, block.body);
            return path ? fileEntry(path)
                : {id: name, name: `refs.${name}()`, iconType: 'relation', detail: 'unresolved', navigable: false};
        }),
        pages: [],
    };
}

/**
 * Everything the References tab shows, found in the text of the workspace's files. A query's id is its path; a
 * page block's (`page.md#name`) is read within its page, where blocks call each other by name.
 */
export function useRelationReferences(relationState: RelationState): RelationReferences {
    const files = useWorkspace(s => s.files);
    const path = relationState.id;
    const baseQuery = relationState.query.baseQuery;

    return useMemo(() => {
        const page = pageOfSurface(path);
        if (page) return blockReferences(files, page, path.slice(page.length + 1), baseQuery ?? '');
        const users = path in files ? usersOf(files, path) : {queries: [], pages: []};
        return {
            usedByRelations: users.queries.map(fileEntry),
            usesRelations: queriesCalledBy(files, baseQuery ?? '').map(({name, path}) => path
                ? fileEntry(path)
                : {id: name, name: `refs.${name}()`, iconType: 'relation', detail: 'unresolved', navigable: false}),
            pages: users.pages.map(fileEntry),
        };
    }, [files, path, baseQuery]);
}
