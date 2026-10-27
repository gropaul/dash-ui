import {useWorkspace} from "@/state/workspace/workspace.state";
import {WorkspaceNodeKind} from "@/state/workspace/workspace-tree";
import {viewOfQuery} from "@/state/workspace/relation-config";

/** The `ColoredIcon` type of a file: a query's follows its view. */
export function fileIconType({kind, path}: { kind: WorkspaceNodeKind, path: string }): string {
    if (kind === 'page') return 'dashboards';
    if (kind === 'sources') return 'database';
    if (kind !== 'query') return kind;
    return viewOfQuery(useWorkspace.getState().files[path] ?? '');
}
