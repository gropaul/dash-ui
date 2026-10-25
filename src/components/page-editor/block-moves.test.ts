import {describe, expect, it} from 'vitest';
import {KEYS, TElement} from "platejs";
import {createPlateEditor} from "platejs/react";
import {BaseColumnPlugin} from "@platejs/layout";
import {BlockSelectionPlugin} from "@platejs/selection/react";
import {insertAtSlash, moveBlocks} from "@/components/page-editor/block-moves";
import {spanOf, spanToWidth, TColumnElement} from "@/components/page-editor/model";

const p = (id: string): TElement => ({id, type: KEYS.p, children: [{text: id}]});
const column = (id: string, span: number, ...blocks: TElement[]): TElement =>
    ({id, type: KEYS.column, width: spanToWidth(span), children: blocks});

function createEditor() {
    const editor = createPlateEditor({
        plugins: [BaseColumnPlugin, BlockSelectionPlugin],
        value: [p('a'), p('b'), {id: 'row', type: KEYS.columnGroup, children: [column('c1', 6, p('c')), column('c2', 6, p('d'))]}],
    });
    return editor;
}

const ids = (nodes: TElement[]) => nodes.map(node => node.id);

describe('moving selected blocks', () => {
    // Plate's block selection redirects setNodes to the selected blocks; the move must not depend on that.
    it('puts the selection beside a block in a row, halving that column', () => {
        const editor = createEditor();
        editor.getApi(BlockSelectionPlugin).blockSelection.set(['a', 'b']);

        moveBlocks(editor, ['a', 'b'], 'd', 'right');

        const [row] = editor.children as TElement[];
        expect(editor.children).toHaveLength(1);
        const columns = row.children as TColumnElement[];
        expect(columns.map(spanOf)).toEqual([6, 3, 3]);
        expect(ids(columns[2].children as TElement[])).toEqual(['a', 'b']);
        expect([...editor.getOption(BlockSelectionPlugin, 'selectedIds')!]).toEqual(['a', 'b']);
    });

    it('gives the width of an emptied column to its neighbour', () => {
        const editor = createEditor();
        editor.getApi(BlockSelectionPlugin).blockSelection.set(['a', 'c']);

        moveBlocks(editor, ['a', 'c'], 'b', 'bottom');

        // The row is left with one column, which Plate unwraps.
        expect(ids(editor.children as TElement[])).toEqual(['b', 'a', 'c', 'd']);
    });
});

describe('a block picked after typing /', () => {
    const chart: TElement = {id: 'chart', type: 'relation', children: [{text: ''}]};
    const line = (id: string, text: string): TElement => ({id, type: KEYS.p, children: [{text}]});

    it('takes the place of a line holding only the /', () => {
        const editor = createPlateEditor({plugins: [BaseColumnPlugin, BlockSelectionPlugin], value: [line('a', 'A'), line('b', '/')]});
        insertAtSlash(editor, {path: [1, 0], offset: 0}, chart);
        expect(ids(editor.children)).toEqual(['a', 'chart']);
    });

    it('goes below the line otherwise, or below the block in a column, and the / goes', () => {
        const editor = createPlateEditor({
            plugins: [BaseColumnPlugin, BlockSelectionPlugin],
            value: [{id: 'row', type: KEYS.columnGroup, children: [column('c1', 6, line('a', 'Text /')), column('c2', 6, p('b'))]}],
        });
        insertAtSlash(editor, {path: [0, 0, 0, 0], offset: 5}, chart);
        const [left] = (editor.children[0] as TElement).children as TElement[];
        expect(ids(left.children as TElement[])).toEqual(['a', 'chart']);
        expect(editor.api.string([0, 0, 0])).toBe('Text ');
    });
});
