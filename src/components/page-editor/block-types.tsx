'use client';

import {
    Code,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    List,
    ListOrdered,
    ListTodo,
    LucideIcon,
    Pilcrow,
    TextQuote,
} from "lucide-react";
import {ElementApi, KEYS, TElement} from "platejs";
import {createPlatePlugin, PlateEditor} from "platejs/react";
import {BlockSelectionPlugin} from "@platejs/selection/react";
import {indentList, outdentList, toggleList} from "@platejs/list";
import {toggleCodeBlock} from "@platejs/code-block";

/** The text block types the GUI offers; each maps to a Plate block type or list style. */
export const BLOCK_TYPES = [
    {key: KEYS.p, label: 'Text', icon: Pilcrow},
    {key: KEYS.h1, label: 'Heading 1', icon: Heading1},
    {key: KEYS.h2, label: 'Heading 2', icon: Heading2},
    {key: KEYS.h3, label: 'Heading 3', icon: Heading3},
    {key: KEYS.h4, label: 'Heading 4', icon: Heading4},
    {key: KEYS.ul, label: 'Bulleted list', icon: List},
    {key: KEYS.ol, label: 'Numbered list', icon: ListOrdered},
    {key: KEYS.listTodo, label: 'To-do list', icon: ListTodo},
    {key: KEYS.blockquote, label: 'Quote', icon: TextQuote},
    {key: KEYS.codeBlock, label: 'Code', icon: Code},
] satisfies { key: string, label: string, icon: LucideIcon }[];

const LIST_TYPES: string[] = [KEYS.ul, KEYS.ol, KEYS.listTodo];

/** An empty block of one of the BLOCK_TYPES, or a divider. */
export function createBlock(type: string): TElement {
    const text = [{text: ''}];
    if (LIST_TYPES.includes(type)) return {type: KEYS.p, listStyleType: type, indent: 1, children: text};
    if (type === KEYS.blockquote) return {type, children: [{type: KEYS.p, children: text}]};
    if (type === KEYS.codeBlock) return {type, children: [{type: KEYS.codeLine, children: text}]};
    return {type, children: text};
}

function textBlocks(editor: PlateEditor) {
    return {
        match: (n: unknown) => ElementApi.isElement(n) && editor.api.isBlock(n) && !editor.api.isVoid(n)
            && n.type !== KEYS.blockquote && n.type !== KEYS.column && n.type !== KEYS.columnGroup,
        mode: 'lowest' as const,
    };
}

/** The type of the block at the cursor, in the keys of BLOCK_TYPES. */
function getBlockType(editor: PlateEditor): string | undefined {
    const entry = editor.api.block();
    if (!entry) return;
    const [node, path] = entry as [TElement & { listStyleType?: string }, number[]];
    if (node.listStyleType) return node.listStyleType;
    if (node.type === KEYS.codeLine) return KEYS.codeBlock;
    if (editor.api.above({at: path, match: {type: KEYS.blockquote}})) return KEYS.blockquote;
    return node.type;
}

/** Turns the selected text blocks into `type`, first undoing whatever list, quote or code they were. */
export function setBlockType(editor: PlateEditor, type: string) {
    editor.tf.withoutNormalizing(() => {
        if (getBlockType(editor) === KEYS.codeBlock) toggleCodeBlock(editor);
        editor.tf.unwrapNodes({match: {type: KEYS.blockquote}, split: true});
        editor.tf.unsetNodes([KEYS.listType, KEYS.indent, 'checked'], textBlocks(editor));

        if (LIST_TYPES.includes(type)) {
            editor.tf.setNodes({type: KEYS.p}, textBlocks(editor));
            toggleList(editor, {listStyleType: type});
        } else if (type === KEYS.blockquote) {
            editor.tf.setNodes({type: KEYS.p}, textBlocks(editor));
            editor.tf.wrapNodes({type: KEYS.blockquote, children: []}, textBlocks(editor));
        } else if (type === KEYS.codeBlock) {
            editor.tf.setNodes({type: KEYS.p}, textBlocks(editor));
            toggleCodeBlock(editor);
        } else {
            editor.tf.setNodes({type}, textBlocks(editor));
        }
    });
    editor.tf.focus();
}

/** Tab nests the list items at the cursor one level deeper, Shift+Tab moves them back out. */
export const ListTabPlugin = createPlatePlugin({
    key: 'listTab',
    handlers: {
        onKeyDown: ({editor, event}) => {
            if (event.key !== 'Tab' || event.altKey || event.metaKey || event.ctrlKey) return;
            const listStyleType = (editor.api.block()?.[0] as { listStyleType?: string } | undefined)?.listStyleType;
            if (!listStyleType) return;
            event.preventDefault();
            if (event.shiftKey) outdentList(editor);
            else indentList(editor, {listStyleType});
            return true;
        },
    },
});

/** The BLOCK_TYPES key of a block, or undefined for blocks that aren't text (charts, rows, dividers). */
export function getElementType(element: TElement): string | undefined {
    const type = (element as { listStyleType?: string }).listStyleType ?? element.type;
    return BLOCK_TYPES.some(t => t.key === type) ? type : undefined;
}

export function selectBlocks(editor: PlateEditor, ids: string[]) {
    const entries = ids
        .map(id => editor.api.node<TElement>({id, at: []}))
        .filter((entry): entry is NonNullable<typeof entry> => !!entry);
    editor.getApi(BlockSelectionPlugin).blockSelection.clear();
    editor.tf.select(editor.api.nodesRange(entries));
}
