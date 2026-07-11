'use client';

import {SpacesRouter} from "@/components/layout/spaces-router";
import {DataView} from "@/components/spaces/data-view";
import {DATA_ROOT} from "@/state/routing/core-model";
import {useCurrentPath} from "@/state/routing/use-location";

/**
 * Top-level client router behind the single static shell. Dispatches by the first
 * path segment: `/data` → DatabaseView, everything else → SpacesRouter (which owns
 * `/workspace`, root canonicalisation and not-found).
 */
export function AppRouter() {
    const pathname = useCurrentPath();

    if (pathname.startsWith(DATA_ROOT)) {
        return <DataView/>;
    }

    return <SpacesRouter/>;
}
