import {KEYS, TElement} from "platejs";
import {createPlateEditor} from "platejs/react";
import {MarkdownPlugin} from "@platejs/markdown";
import {EditorFolder} from "@/model/editor-folder";
import {useRelationsState} from "@/state/relations.state";
import {findPage, relativePath, resolvePageLink, resolveQueryInput} from "@/state/routing/page-links";
import {RELATION_BLOCK_KEY, TRelationBlock} from "@/components/page-editor/model";
import {PAGE_EDITOR_PLUGINS} from "@/components/page-editor/editor-plugins";
import {serializePage} from "@/components/page-editor/markdown";

/**
 * The page's markdown with each link to another page, and each block's `-- input:` query, moved from where the
 * page or query was in `before` to where it is in `after`. A link showing the page's old name shows its new one;
 * one with its own text keeps it.
 */
export function movePageLinks(markdown: string, pageId: string, before: EditorFolder[], after: EditorFolder[]): string {
    if (!/\.(md|sql)\b/i.test(markdown)) return markdown;
    const editor = createPlateEditor({plugins: PAGE_EDITOR_PLUGINS});
    editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(markdown));
    let changed = false;
    editor.tf.withoutNormalizing(() => {
        for (const [link, path] of [...editor.api.nodes<TElement & { url: string }>({at: [], match: {type: KEYS.link}})]) {
            const target = resolvePageLink(before, pageId, link.url);
            const url = target && relativePath(after, pageId, target.id);
            if (!target || !url) continue;
            if (url !== link.url) {
                editor.tf.setNodes({url}, {at: path});
                changed = true;
            }
            const name = findPage(after, target.id)?.name;
            if (name && name !== target.name && editor.api.string(path) === target.name) {
                editor.tf.insertText(name, {at: editor.api.range(path)});
                changed = true;
            }
        }
        for (const [block, path] of [...editor.api.nodes<TRelationBlock>({at: [], match: {type: RELATION_BLOCK_KEY}})]) {
            const target = block.header.input && resolveQueryInput(before, pageId, block.header.input);
            const input = target && relativePath(after, pageId, target.id);
            if (input && input !== block.header.input) {
                editor.tf.setNodes<TRelationBlock>({header: {...block.header, input}}, {at: path});
                changed = true;
            }
        }
    });
    return changed ? serializePage(editor) : markdown;
}

/** Points every page's links, made when the project's tree was `before`, at the pages' paths now. */
export function updatePageLinks(before: EditorFolder[]) {
    const {editorElements: after, dashboards, setDashboardMarkdown} = useRelationsState.getState();
    if (after === before) return;
    for (const dashboard of Object.values(dashboards)) {
        const markdown = movePageLinks(dashboard.markdown ?? '', dashboard.id, before, after);
        if (markdown !== (dashboard.markdown ?? '')) setDashboardMarkdown(dashboard.id, markdown);
    }
}
