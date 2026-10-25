import {useCallback, useEffect, useMemo} from "react";
import {create} from "zustand";
import {TElement} from "platejs";
import {createPlatePlugin, useEditorRef, usePluginOption} from "platejs/react";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {buildRelation, RelationConfig, splitHeader} from "@/state/workspace/relation-config";
import {queryName} from "@/state/workspace/file-references";
import {resolveRelative} from "@/state/workspace/paths";
import {useFile} from "@/state/workspace/workspace.state";
import {useSurfaces} from "@/state/workspace/surfaces.state";
import {useRelationModel} from "@/components/relation/use-relation-model";
import {RELATION_BLOCK_KEY, TRelationBlock} from "@/components/page-editor/model";

/** The path of the page the editor shows; blocks are keyed by it and resolve their `input` from it. */
export const PagePathPlugin = createPlatePlugin({
    key: 'pagePath',
    options: {path: ''},
});

/** The block open in the fullscreen dialog, by its node id. */
export const useBlockFullscreen = create<{ blockId: string | null, open: (blockId: string | null) => void }>((set) => ({
    blockId: null,
    open: (blockId) => set({blockId}),
}));

/**
 * The surface key of a block: `page.md#name`, what its refs and in-memory state go by. An unnamed block can't be
 * read by refs; it goes by its node id, which lasts while the page is open.
 */
export function blockSurface(page: string, block: TRelationBlock): string {
    return `${page}#${block.name ?? block.id}`;
}

/** The query a block's `-- input:` names, relative to the page, before it ran; undefined if there is none. */
function useInput(page: string, block: TRelationBlock | undefined) {
    const path = block?.header.input ? resolveRelative(page, block.header.input) : undefined;
    const text = useFile(path ?? '');
    return useMemo(() => path && text !== undefined
        ? buildRelation({id: path, name: queryName(path), ...splitHeader(text)})
        : undefined, [path, text]);
}

/**
 * The relation behind a relation block and its actions; config from the block, the rest in memory. Undefined for
 * any other block, and for a block whose input names no query, so it can be called for every block.
 */
export function useBlockRelation(element: TElement) {
    const editor = useEditorRef();
    const page = usePluginOption(PagePathPlugin, 'path');
    const block = element.type === RELATION_BLOCK_KEY ? element as TRelationBlock : undefined;
    const input = useInput(page, block);
    const missing = !!block?.header.input && !input;

    const config = useMemo((): RelationConfig | undefined => block && !missing
        ? {id: blockSurface(page, block), name: block.name ?? '', sql: block.sql, header: block.header}
        : undefined, [page, block, missing]);
    const write = useCallback((sql: string, header: Record<string, string>) => {
        const path = editor.api.findPath(element);
        if (path) editor.tf.setNodes<TRelationBlock>({sql, header}, {at: path});
    }, [editor, element]);
    const model = useRelationModel(config, write, input);

    // An unnamed block's state goes with it; a named one's stays for a block of that name, e.g. after an undo.
    const unnamedId = block && !block.name ? config?.id : undefined;
    useEffect(() => () => {
        if (unnamedId) useSurfaces.getState().remove(unnamedId);
    }, [unnamedId]);

    const actions = useMemo(
        () => model && getRelationActions({mode: 'embedded', relationState: model.relation, updateRelation: model.updateRelation}),
        [model],
    );
    return model && actions ? {...model, actions} : undefined;
}
