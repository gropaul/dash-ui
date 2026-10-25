import {createPlateEditor} from "platejs/react";
import {MarkdownPlugin} from "@platejs/markdown";
import {EditorFolder} from "@/model/editor-folder";
import {RelationState} from "@/model/relation-state";
import {resolveQueryInput} from "@/state/routing/page-links";
import {useRelationDataState} from "@/state/relations-data.state";
import {PAGE_EDITOR_PLUGINS} from "@/components/page-editor/editor-plugins";
import {BlockInputPlugin, relationsInDocument} from "@/components/page-editor/block-relation";

/** Resolves a block's `-- input: <path>.sql` on page `pageId` to the query it names. */
export function inputResolver(tree: EditorFolder[], relations: Record<string, RelationState>, pageId: string) {
    return (path: string) => {
        const node = resolveQueryInput(tree, pageId, path);
        return node && relations[node.id];
    };
}

/** The ids of the page's inline blocks as the page stands; a block's id is its cache table's name. */
export function pageBlockIds(markdown: string, pageId: string, tree: EditorFolder[], relations: Record<string, RelationState>): string[] {
    const editor = createPlateEditor({plugins: PAGE_EDITOR_PLUGINS});
    editor.setOption(BlockInputPlugin, 'resolve', inputResolver(tree, relations, pageId));
    editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(markdown));
    return Object.keys(relationsInDocument(editor));
}

/** Drops the cache tables of the page's blocks. */
export async function deletePageTables(markdown: string, pageId: string, tree: EditorFolder[], relations: Record<string, RelationState>) {
    for (const id of pageBlockIds(markdown, pageId, tree, relations)) {
        await useRelationDataState.getState().deleteData(id);
    }
}
