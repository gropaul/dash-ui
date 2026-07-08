'use client';

import {useEffect} from "react";
import {useRelationsState} from "@/state/relations.state";
import {findNodeByMacroPath, parseRoute, SPACES_ROOT} from "@/state/routing/core-model";
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
        const node = findNodeByMacroPath(editorElements, params.segments);
        if (!node) return <NotFound/>;
        switch (node.type) {
            case "folder":
                return <FolderView folderNode={node} segments={params.segments}/>;
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

    return <NotFound/>;
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
