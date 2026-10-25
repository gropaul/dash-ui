import type {MouseEvent, TouchEvent} from "react";
import {KEYS, SlateEditor, TElement} from "platejs";

export const RELATION_BLOCK_KEY = 'relation';
export const GRID_COLUMNS = 12;
export const MIN_COLUMN_SPAN = 2;
// Every block is a whole number of rows, so blocks stacked in one column end where a block beside them ends.
// One row fits a line of text with its spacing, or an input's 40px box with 4px above and below.
export const GRID_ROW_PX = 48;
export const DEFAULT_BLOCK_ROWS = 6;

// Inputs (a dropdown, a slider) are one grid row, without a frame or height bar.
const INPUT_VIEWS = ['select', 'slider'];
export const INPUT_ROWS = 1;

/** A block showing a relation: a chart, table, dropdown, ... In markdown it is a ```sql fence, see markdown.ts. */
export interface TRelationBlock extends TElement {
    type: typeof RELATION_BLOCK_KEY;
    /** The block's name, ```sql <name>: what other blocks read it by, `refs.<name>()`, and its title. */
    name?: string;
    sql: string;
    /** The fence's header, apart from `rows`: `view`, `x`, `y`, `column`, `input` and `settings` (relation-config.ts). */
    header: Record<string, string>;
    rows: number;
}

export interface TColumnElement extends TElement {
    width: string;
}

export function isInputView(viewType: string | undefined) {
    return INPUT_VIEWS.includes(viewType ?? '');
}

/** Whether the fence shows an input. */
export function isInputBlock(block: TRelationBlock) {
    return isInputView(block.header.view);
}

// Columns keep Plate's percentage `width`, always a whole number of grid columns.
export function spanOf(column: TColumnElement) {
    return Math.round(parseFloat(column.width) / 100 * GRID_COLUMNS);
}

export function spanToWidth(span: number) {
    return `${span / GRID_COLUMNS * 100}%`;
}

export function evenSpans(n: number) {
    return Array.from({length: n}, (_, i) => Math.floor(GRID_COLUMNS / n) + (i < GRID_COLUMNS % n ? 1 : 0));
}

// Pressing a resize handle would otherwise start a text selection in the editor.
export const preventTextSelection = (e: MouseEvent | TouchEvent) => e.preventDefault();

export function createRelationBlock(sql: string, header: Record<string, string>, rows = DEFAULT_BLOCK_ROWS, name?: string): TRelationBlock {
    return {type: RELATION_BLOCK_KEY, ...(name && {name}), sql, header, rows, children: [{text: ''}]};
}

/** `<base>_<n>` with the lowest `n` no block of the page has as its name. */
export function uniqueBlockName(editor: SlateEditor, base: string): string {
    const taken = new Set([...editor.api.nodes<TRelationBlock>({at: [], match: {type: RELATION_BLOCK_KEY}})].map(([node]) => node.name));
    let n = 1;
    while (taken.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
}

/** Each argument is one column: a single block or the blocks stacked in it. */
export function createColumnGroup(...columns: (TElement | TElement[])[]): TElement {
    const spans = evenSpans(columns.length);
    return {
        type: KEYS.columnGroup,
        children: columns.map((blocks, i) => ({type: KEYS.column, width: spanToWidth(spans[i]), children: [blocks].flat()})),
    };
}
