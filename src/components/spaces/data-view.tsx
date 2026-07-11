'use client';

import {CatalogView} from "@/components/catalog/catalog-view";

/**
 * The /data view: a structural data catalog over the connected databases (tables, views,
 * columns). Replaces the earlier connections-overview placeholder.
 */
export function DataView() {
    return <CatalogView/>;
}
