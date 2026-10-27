import {createPlatePlugin, PlateEditor} from "platejs/react";

/** The innermost block under the pointer: only that one shows its handle. */
export const BlockHoverPlugin = createPlatePlugin({
    key: 'blockHover',
    options: {hoveredId: null as string | null},
}).extendSelectors(({getOptions}) => ({
    isHovered: (id: string) => getOptions().hoveredId === id,
}));

export function onEditorMouseOver(editor: PlateEditor, target: EventTarget) {
    const block = target instanceof Element ? target.closest<HTMLElement>('[data-draggable-id]') : null;
    const id = block?.dataset.draggableId ?? null;
    if (editor.getOption(BlockHoverPlugin, 'hoveredId') !== id) editor.setOption(BlockHoverPlugin, 'hoveredId', id);
}
