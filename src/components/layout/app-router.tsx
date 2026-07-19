'use client';

import {RouterProject} from "@/components/layout/sub-router/router-project";
import {RouterData} from "@/components/layout/sub-router/router-data";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {DashLocation} from "@/state/routing/navigation";
import {useProjectRouteSync} from "@/state/projects.state";

export interface SubRouterProps {
    location: DashLocation;
}

export function AppRouter() {
    const location = useDashLocation();

    // Reconcile the current project with the `/projects/<slug>` in the URL.
    useProjectRouteSync();

    if (location.basePath === "data") {
        return <RouterData location={location}/>;
    }

    return <RouterProject location={location}/>;
}
