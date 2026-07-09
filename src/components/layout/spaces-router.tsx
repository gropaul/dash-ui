'use client';

import {useEffect} from "react";
import {useRelationsState} from "@/state/relations.state";
import {findNodeByMacroPath, parseRoute, SPACES_ROOT} from "@/state/routing/core-model";
import {buildRoutableTree} from "@/state/routing/routable-tree";
import {navigateReplace} from "@/state/routing/navigation";
import {onNavClick, useCurrentPath} from "@/state/routing/use-location";
import {FolderView} from "@/components/spaces/folder-view";
import {RelationTab} from "@/components/relation/relation-tab";
import {DashboardTab} from "@/components/dashboard/dashboard-tab";
import {CanvasTab} from "@/components/canvas/canvas-tab";

/**
 * The single view dispatcher behind the catch-all route. Reads the pathname,
 * resolves it against the live editor tree, and renders the matching view.
 * `parseRoute` stays pure; folder-vs-leaf resolution happens here.
 */
export function SpacesRouter() {
    const pathname = useCurrentPath();
    const editorElements = useRelationsState((state) => state.editorElements);

    const {view, params} = parseRoute(pathname);

    // Canonicalise the bare root to /spaces.
    useEffect(() => {
        if (view === "spaces-root" && pathname !== SPACES_ROOT) {
            navigateReplace(SPACES_ROOT);
        }
    }, [view, pathname]);

    if (view === "spaces-root") {
        return <FolderView segments={[]}/>;
    }

    if (view === "spaces") {
        // Primary resolution on the raw tree; if that misses, the URL may address a relation
        // shown in the context of a dashboard/canvas (a virtual child) — resolve on the
        // augmented tree. getState() reads are fine here: resolution only matters on navigation
        // / editorElements changes, both of which re-render this component.
        let node = findNodeByMacroPath(editorElements, params.segments);
        if (!node) {
            const st = useRelationsState.getState();
            node = findNodeByMacroPath(
                buildRoutableTree(editorElements, st.relations, st.dashboards, st.canvas),
                params.segments,
            );
        }
        if (!node) return <NotFound/>;
        return <ResolvedView node={node} segments={params.segments}/>;
    }

    return <NotFound/>;
}

/**
 * Renders the view for a resolved node and — as a side effect keyed on the node id —
 * stamps its "last viewed" metadata once per visit (covers clicks, direct URLs, back/forward).
 */
type ResolvedNode = NonNullable<ReturnType<typeof findNodeByMacroPath>>;

function ResolvedView({node, segments}: {node: ResolvedNode; segments: string[]}) {
    const markEntityViewed = useRelationsState((state) => state.markEntityViewed);

    useEffect(() => {
        if (node.type === "folder" || node.type === "relations" || node.type === "dashboards" || node.type === "canvas") {
            markEntityViewed(node.type, node.id);
        }
    }, [node.id, node.type, markEntityViewed]);

    switch (node.type) {
        case "folder":
            return <FolderView folderNode={node} segments={segments}/>;
        case "relations":
            return <RelationTab relationId={node.id}/>;
        case "dashboards":
            return <DashboardTab dashboardId={node.id}/>;
        case "canvas":
            return <CanvasTab canvasId={node.id}/>;
        default:
            return <NotFound/>;
    }
}

function NotFound() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="text-lg">Nothing here</div>
            <a href={SPACES_ROOT} onClick={onNavClick(SPACES_ROOT)}
               className="text-sm underline hover:text-foreground">Back to Workspace</a>
        </div>
    );
}
