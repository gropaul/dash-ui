'use client';

import {useEffect} from "react";
import {useRelationsState} from "@/state/relations.state";
import {FolderView} from "@/components/workbench/folder-view";
import {ProjectListView} from "@/components/projects/project-list-view";
import {RelationTab} from "@/components/relation/relation-tab";
import {DashboardTab} from "@/components/dashboard/dashboard-tab";
import {CanvasTab} from "@/components/canvas/canvas-tab";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {SubRouterProps} from "@/components/layout/app-router";
import {TreeNode} from "@/components/basics/files/tree-utils";


interface ProjectRouterProps extends SubRouterProps {

}

/**
 * The view dispatcher behind the workspace side of the router. `/projects` lists the projects;
 * `/projects/<slug>` is that project's root; deeper paths resolve against the live editor tree.
 */
export function RouterProject(props: ProjectRouterProps) {

    if (props.location.basePath !== "object") {
        throw new Error(`Unexpected props.location kind ${props.location.basePath} in ProjectRouter`);
    }

    // No project selected -> Show project list
    if (!props.location.projectSlug){
        return <ProjectListView/>;
    }

    // Project root.
    if (props.location.path.length === 0) {
        return <FolderView segments={[]}/>;
    }

    // Primary resolution on the raw tree; if that misses, the URL may address a relation shown
    // in the context of a dashboard/canvas (a virtual child) — resolve on the augmented tree.
    // getState() reads are fine here: resolution only matters on navigation / editorElements
    // changes, both of which re-render this component.
    let node = DashNavigator.instance().getObjectFromLocation(DashLocations.CurrentProjectElement(props.location.path));
    if (!node) return <NotFound/>;
    return <ResolvedView node={node} segments={props.location.path}/>;
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
