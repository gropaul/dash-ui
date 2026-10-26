'use client';

import {useEffect} from "react";
import {useProjectsState} from "@/state/projects.state";
import {ConnectionsView} from "@/components/connections/connections-view";
import {CatalogView} from "@/components/catalog/catalog-view";
import {QueryTab} from "@/components/relation/query-tab";
import {PageTab} from "@/components/dashboard/page-tab";
import {GetStartedPage} from "@/components/onboarding/get-started-page";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {SubRouterProps} from "@/components/layout/app-router";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {useFileStats} from "@/state/workspace/file-stats.state";
import {kindOf} from "@/state/workspace/workspace-tree";


interface ProjectRouterProps extends SubRouterProps {

}

/**
 * The view dispatcher for a specific project. `/projects/<id>/connections` is the connections tab;
 * `/projects/<id>/data[/<seg>…]` is the catalog; `/projects/<id>/workspace/<path>` opens the file at that path.
 */
export function RouterProject(props: ProjectRouterProps) {
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

    if (location.section === "connections") {
        return <ConnectionsView/>;
    }

    // The catalog (reads its segments from the location itself).
    if (location.section === "data") {
        return <CatalogView/>;
    }

    if (location.path.length === 0) {
        return <GetStartedPage/>;
    }
    return <FileView projectId={location.projectId} path={location.path.join('/')}/>;
}

function FileView({projectId, path}: { projectId: string, path: string }) {
    const exists = useWorkspace(s => path in s.files);
    const markViewed = useFileStats(s => s.markViewed);

    useEffect(() => {
        if (exists) markViewed(projectId, path);
    }, [exists, projectId, path, markViewed]);

    if (!exists) return <NotFound/>;
    switch (kindOf(path)) {
        case "page":
            return <PageTab path={path}/>;
        case "query":
            return <QueryTab path={path}/>;
        case "sources":
            return <ConnectionsView/>;
        default:
            return <NotFound/>;
    }
}

function NotFound() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="text-lg">Nothing here</div>
            <a onClick={DashNavigator.instance().onClickNavigateToLocation(DashLocations.CurrentProjectRoot())}
               className="text-sm underline hover:text-foreground">Back to the workspace</a>
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
