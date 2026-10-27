import {PlateEditor} from "platejs/react";
import {renameRefCalls} from "@/platform/sql-refs";
import {renameBlockSurfaces} from "@/state/workspace/rename-block";
import {blockSurface} from "@/components/page-editor/block-relation";
import {withoutBlockSelection} from "@/components/page-editor/block-moves";
import {RELATION_BLOCK_KEY, TRelationBlock} from "@/components/page-editor/model";

/** Renames the block whose surface is `relationId`, and its refs in the other blocks (see renameBlockSurfaces). */
export function renameBlock(editor: PlateEditor, page: string, relationId: string, name: string) {
    const blocks = [...editor.api.nodes<TRelationBlock>({at: [], match: {type: RELATION_BLOCK_KEY}})];
    const entry = blocks.find(([node]) => blockSurface(page, node) === relationId);
    if (!entry) return;
    const [block, path] = entry;
    const from = block.name;
    renameBlockSurfaces(relationId, name);

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
