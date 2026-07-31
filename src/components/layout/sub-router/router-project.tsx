'use client';

import {useEffect} from "react";
import {useRelationsState} from "@/state/relations.state";
import {useProjectsState} from "@/state/projects.state";
import {FolderView} from "@/components/workbench/folder-view";
import {SourcesView} from "@/components/sources/sources-view";
import {CatalogView} from "@/components/catalog/catalog-view";
import {RelationTab} from "@/components/relation/relation-tab";
import {DashboardTab} from "@/components/dashboard/dashboard-tab";
import {CanvasTab} from "@/components/canvas/canvas-tab";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {SubRouterProps} from "@/components/layout/app-router";
import {TreeNode} from "@/components/basics/files/tree-utils";


interface ProjectRouterProps extends SubRouterProps {

}

/**
 * The view dispatcher for a specific project. `/projects/<id>/sources` is the data-sources tab;
 * `/projects/<id>/data[/<seg>…]` is the catalog; `/projects/<id>/workspace[/<seg>…]` is the
 * object tree (empty path is the project root, deeper paths resolve against the live editor tree).
 */
export function RouterProject(props: ProjectRouterProps) {

    // Resolution below reads the tree non-reactively (getState), so subscribe here to re-render
    // and re-resolve when the tree changes (add / rename / delete / move) — without this a delete
    // inside the current folder leaves the stale node on screen (URL is unchanged).
    useRelationsState((s) => s.editorElements);
    // Reactive so a project rename/delete re-resolves below.
    const projects = useProjectsState((s) => s.projects);

    if (props.location.basePath !== "project") {
        throw new Error(`Unexpected props.location kind ${props.location.basePath} in RouterProject`);
    }
    const location = props.location;

    // Unknown project id -> don't fall back to the loaded project (that just showed the last
    // project for any bogus URL). Show a not-found state instead.
    if (!projects[location.projectId]) {
        return <ProjectNotFound/>;
    }

    // Data-sources tab.
    if (location.section === "sources") {
        return <SourcesView/>;
    }

    // The catalog (reads its segments from the location itself).
    if (location.section === "data") {
        return <CatalogView/>;
    }

    // Workspace root.
    if (location.path.length === 0) {
        return <FolderView segments={[]}/>;
    }

    // Primary resolution on the raw tree; if that misses, the URL may address a relation shown
    // in the context of a dashboard/canvas (a virtual child) — resolve on the augmented tree.
    // getState() reads are fine here: resolution only matters on navigation / editorElements
    // changes, both of which re-render this component.
    const node = DashNavigator.instance().getObjectFromLocation(DashLocations.CurrentProjectElement(location.path));
    if (!node) return <NotFound/>;
    return <ResolvedView node={node} segments={location.path}/>;
}

function ResolvedView({node, segments}: { node: TreeNode; segments: string[] }) {
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
            <a onClick={DashNavigator.instance().onClickNavigateToLocation(DashLocations.CurrentProjectRoot())}
               className="text-sm underline hover:text-foreground">Back to Projects</a>
        </div>
    );
}

function ProjectNotFound() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="text-lg">Project not found</div>
            <a onClick={DashNavigator.instance().onClickNavigateToLocation(DashLocations.ProjectsList())}
               className="text-sm underline hover:text-foreground">Back to Projects</a>
        </div>
    );
}
