import {useEffect} from "react";
import {PlateEditor} from "platejs/react";
import {humanizeName} from "@/platform/string-utils";
import {renameRefCalls} from "@/platform/sql-refs";
import {onRelationEvent, RelationEvent} from "@/state/relations/event/relation-events";
import {refreshDownstreamIn} from "@/state/relations/sql/relation-dag-refresh";
import {blocksOfPage} from "@/state/relations/sql/page-refs";
import {pageOfSurface, useSurfaces} from "@/state/workspace/surfaces.state";
import {useRelationDataState} from "@/state/relations-data.state";
import {blockSurface} from "@/components/page-editor/block-relation";
import {withoutBlockSelection} from "@/components/page-editor/block-moves";
import {RELATION_BLOCK_KEY, TRelationBlock} from "@/components/page-editor/model";

/**
 * Re-runs the blocks of the page reading a block once it ran or its pick changed. They read it through
 * `refs.<name>()`, expanded into their query when they run (page-refs.ts).
 */
export async function onBlockRelationEvent(page: string, event: RelationEvent) {
    const relation = event.new;
    if (!relation || pageOfSurface(relation.id) !== page) return;
    await refreshDownstreamIn(relation.id, () => blocksOfPage(page), useSurfaces.getState().set);
}

/**
 * Renames the block whose surface is `relationId`, and its refs in the other blocks. Its pick, run and result
 * move to the key of its new name.
 */
export function renameBlock(editor: PlateEditor, page: string, relationId: string, name: string) {
    const blocks = [...editor.api.nodes<TRelationBlock>({at: [], match: {type: RELATION_BLOCK_KEY}})];
    const entry = blocks.find(([node]) => blockSurface(page, node) === relationId);
    if (!entry) return;
    const [block, path] = entry;
    const from = block.name;
    const id = blockSurface(page, {...block, name});

    const surfaces = useSurfaces.getState();
    const previous = surfaces.relations[relationId];
    if (previous) {
        const viewParameters = structuredClone(previous.query.viewParameters);
        const oldTitle = humanizeName(from ?? '');
        if (viewParameters.chart && viewParameters.chart.plot.title === oldTitle) viewParameters.chart.plot.title = humanizeName(name);
        if (viewParameters.select && viewParameters.select.label === oldTitle) viewParameters.select.label = humanizeName(name);
        const data = useRelationDataState.getState().getData(relationId);
        if (data) useRelationDataState.getState().updateData(id, data);
        surfaces.set({...previous, id, viewState: {...previous.viewState, displayName: name}, query: {...previous.query, viewParameters}});
        surfaces.remove(relationId);
    }

    withoutBlockSelection(editor, () => {
        if (from) {
            for (const [node, at] of blocks) {
                const sql = renameRefCalls(node.sql, from.toLowerCase(), name);
                if (node !== block && sql !== node.sql) editor.tf.setNodes<TRelationBlock>({sql}, {at});
            }
        }
        editor.tf.setNodes<TRelationBlock>({name}, {at: path});
    });
}

/** Lets one block of the page read another through `refs.<name>()`, e.g. a chart filtered by a dropdown. */
export function useRelationLinks(page: string) {
    useEffect(() => onRelationEvent(
        (event) => onBlockRelationEvent(page, event),
        ["QUERY_RUN_FINISHED", "UPDATE_SELECTION"],
    ), [page]);
}
