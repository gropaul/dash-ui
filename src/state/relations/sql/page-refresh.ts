import {useEffect} from "react";
import {onRelationEvent, RelationEvent} from "@/state/relations/event/relation-events";
import {refreshDownstreamIn} from "@/state/relations/sql/relation-dag-refresh";
import {blocksOfPage} from "@/state/relations/sql/page-refs";
import {pageOfSurface, useSurfaces} from "@/state/workspace/surfaces.state";

/**
 * Re-runs the blocks of the page reading a block once it ran or its pick changed. They read it through
 * `refs.<name>()`, expanded into their query when they run (page-refs.ts).
 */
export async function onBlockRelationEvent(page: string, event: RelationEvent) {
    const relation = event.new;
    if (!relation || pageOfSurface(relation.id) !== page) return;
    await refreshDownstreamIn(relation.id, () => blocksOfPage(page), useSurfaces.getState().set);
}

/** Lets one block of the page read another through `refs.<name>()`, e.g. a chart filtered by a dropdown. */
export function useRelationLinks(page: string) {
    useEffect(() => onRelationEvent(
        (event) => onBlockRelationEvent(page, event),
        ["QUERY_RUN_FINISHED", "UPDATE_SELECTION"],
    ), [page]);
}
