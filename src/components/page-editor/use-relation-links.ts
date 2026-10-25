import {useEffect} from "react";
import {SlateEditor} from "platejs";
import {PlateEditor} from "platejs/react";
import {humanizeName} from "@/platform/string-utils";
import {renameRefCalls} from "@/platform/sql-refs";
import {onRelationEvent, RelationEvent} from "@/state/relations/event/relation-events";
import {refreshDownstreamIn} from "@/state/relations/sql/relation-dag-refresh";
import {addPageScope} from "@/state/relations/sql/page-refs";
import {useRelationDataState} from "@/state/relations-data.state";
import {buildBlockRelation, inputOf, relationsInDocument, useBlockRelations} from "@/components/page-editor/block-relation";
import {withoutBlockSelection} from "@/components/page-editor/block-moves";
import {RELATION_BLOCK_KEY, TRelationBlock} from "@/components/page-editor/model";

/**
 * Re-runs the inline blocks reading a block (or a relation of the project) once it ran or its pick changed.
 * They read it through `refs.<name>()`, expanded into their query when they run (page-refs.ts).
 */
export async function onBlockRelationEvent(editor: SlateEditor, event: RelationEvent) {
    const relation = event.new;
    if (!relation) return;
    await refreshDownstreamIn(
        relation.id,
        () => ({...relationsInDocument(editor), [relation.id]: relation}),
        useBlockRelations.getState().setRelation,
    );
}

/**
 * Renames the inline block whose relation is `relationId`, and with `updateReferences` its refs in the other
 * blocks. The block keeps its result and pick under the id of its new name.
 */
export function renameBlock(editor: PlateEditor, relationId: string, name: string, updateReferences: boolean) {
    const blocks = [...editor.api.nodes<TRelationBlock>({at: [], match: {type: RELATION_BLOCK_KEY}})].filter(([node]) => !node.relationId);
    const entry = blocks.find(([node]) => buildBlockRelation(node, inputOf(editor, node)).id === relationId);
    if (!entry) return;
    const [block, path] = entry;
    const from = block.name;

    const {relations, setRelation, fullscreen, setFullscreen} = useBlockRelations.getState();
    const previous = relations[relationId];
    const id = buildBlockRelation({...block, name}, inputOf(editor, block)).id;
    if (previous) {
        const viewParameters = structuredClone(previous.query.viewParameters);
        const oldTitle = humanizeName(from ?? '');
        if (viewParameters.chart && viewParameters.chart.plot.title === oldTitle) viewParameters.chart.plot.title = humanizeName(name);
        if (viewParameters.select && viewParameters.select.label === oldTitle) viewParameters.select.label = humanizeName(name);
        const data = useRelationDataState.getState().getData(relationId);
        if (data) useRelationDataState.getState().updateData(id, data);
        setRelation({...previous, id, viewState: {...previous.viewState, displayName: name}, query: {...previous.query, viewParameters}});
    }
    if (fullscreen?.relationId === relationId) setFullscreen({...fullscreen, relationId: id});

    withoutBlockSelection(editor, () => {
        if (from && updateReferences) {
            for (const [node, at] of blocks) {
                const sql = renameRefCalls(node.sql, from.toLowerCase(), name);
                if (node !== block && sql !== node.sql) editor.tf.setNodes<TRelationBlock>({sql}, {at});
            }
        }
        editor.tf.setNodes<TRelationBlock>({name}, {at: path});
    });
}

/** Lets one block read another through `refs.<name>()`, e.g. a chart filtered by a dropdown. */
export function useRelationLinks(editor: PlateEditor) {
    useEffect(() => addPageScope({
        relations: () => relationsInDocument(editor),
        rename: (relationId, name, updateReferences) => renameBlock(editor, relationId, name, updateReferences),
    }), [editor]);
    useEffect(() => onRelationEvent(
        (event) => onBlockRelationEvent(editor, event),
        ["QUERY_RUN_FINISHED", "UPDATE_SELECTION"],
    ), [editor]);
}
