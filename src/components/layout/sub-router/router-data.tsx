'use client';

import {CatalogView} from "@/components/catalog/catalog-view";
import {SubRouterProps} from "@/components/layout/app-router";

/**
 * The /data view: a structural data catalog over the connected databases (tables, views,
 * columns). Replaces the earlier connections-overview placeholder.
 */
export function RouterData(props: SubRouterProps) {
    return <CatalogView/>;
}
