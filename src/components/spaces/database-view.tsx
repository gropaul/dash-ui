'use client';

import {ConnectionsOverviewTab} from "@/components/connections/connections-overview-tab";

/**
 * The /data view. For now it simply re-homes the existing connections/data-sources
 * overview as a full page; richer database content will be added later.
 */
export function DatabaseView() {
    return (
        <div className="h-full w-full overflow-auto">
            <ConnectionsOverviewTab/>
        </div>
    );
}
