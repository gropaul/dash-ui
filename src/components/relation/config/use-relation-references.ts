import {useMemo} from "react";
import {RelationState} from "@/model/relation-state";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {queriesCalledBy, usersOf} from "@/state/workspace/file-references";
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
    dashboards: ReferenceEntry[];
}

function fileEntry(path: string): ReferenceEntry {
    const kind = kindOf(path);
    return {id: path, name: displayName(path), iconType: fileIconType({kind, path}), navigable: true};
}

/**
 * Everything the References tab shows, found in the text of the workspace's files. A query's id is its path; a
 * page block (`page.md#name`) is used only within its page, so only what it calls is listed.
 */
export function useRelationReferences(relationState: RelationState): RelationReferences {
    const files = useWorkspace(s => s.files);
    const path = relationState.id;
    const baseQuery = relationState.query.baseQuery;

    return useMemo(() => {
        const users = path in files ? usersOf(files, path) : {queries: [], pages: []};
        return {
            usedByRelations: users.queries.map(fileEntry),
            usesRelations: queriesCalledBy(files, baseQuery ?? '').map(({name, path}) => path
                ? fileEntry(path)
                : {id: name, name: `refs.${name}()`, iconType: 'relation', detail: 'unresolved', navigable: false}),
            dashboards: users.pages.map(fileEntry),
        };
    }, [files, path, baseQuery]);
}
