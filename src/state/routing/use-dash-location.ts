import {useSyncExternalStore} from "react";
import {DashLocation, DashLocations, DashNavigator} from "@/state/routing/navigation";


/** Reactive current location, updated on History push/replace + browser back/forward. */
export function useDashLocation(): DashLocation {
    const nav = DashNavigator.instance();
    return useSyncExternalStore(nav.subscribe, nav.getCurrentLocation, () => DashLocations.ProjectsList());
}

/** Reactive read of a query-string parameter, updated on History changes + back/forward. */
export function useDashQueryParam(key: string): string | null {
    const nav = DashNavigator.instance();
    return useSyncExternalStore(nav.subscribe, () => nav.getQueryParam(key), () => null);
}