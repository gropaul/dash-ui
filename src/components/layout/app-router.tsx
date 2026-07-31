'use client';

import {RouterProject} from "@/components/layout/sub-router/router-project";
import {ProjectListView} from "@/components/projects/project-list-view";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {DashLocation} from "@/state/routing/navigation";
import {useProjectRouteSync} from "@/state/projects.state";

export interface SubRouterProps {
    location: DashLocation;
}

export function AppRouter() {
    const location = useDashLocation();

    // Reconcile the loaded project with the `/projects/<id>` in the URL.
    useProjectRouteSync();

    if (location.basePath === "projects") {
        return <ProjectListView/>;
    }

    return <RouterProject location={location}/>;
}
