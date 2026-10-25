import {DropLineDirection} from "@platejs/dnd";
import {BlockSelectionPlugin} from "@platejs/selection/react";
import {ElementApi, KEYS, NodeEntry, Path, PathApi, Point, TElement} from "platejs";
import {PlateEditor} from "platejs/react";
import {
    createColumnGroup,
    evenSpans,
    GRID_COLUMNS,
    MIN_COLUMN_SPAN,
    spanOf,
    spanToWidth,
    TColumnElement,
} from "@/components/page-editor/model";

// Moving and removing dashboard blocks, keeping every row on the 12-column grid.

const MAX_COLUMNS = GRID_COLUMNS / MIN_COLUMN_SPAN;

export type Side = Exclude<DropLineDirection, ''>;

/**
 * Top-level blocks and blocks directly inside a column are the movable, selectable units.
 * Rows never nest, so those sit at depth 1 and 3; depth 2 is the columns themselves.
 */
export function isMovableBlock(path: Path) {
    return path.length === 1 || path.length === 3;
}

/** Inserts a block at `at` and puts the cursor at its end. */
export function insertBlock(editor: PlateEditor, node: TElement, at: Path) {
    editor.tf.insertNodes(node, {at});
    editor.tf.select(editor.api.end(at));
    editor.tf.focus();
}

/**
 * Puts the cursor at the end of the page (`[]`) or of a column: into its last block when that is a paragraph,
 * else into a new empty paragraph added after it, as clicking below the last block does in Notion.
 */
export function focusEnd(editor: PlateEditor, containerPath: Path) {
    const children = (containerPath.length ? editor.api.node<TElement>(containerPath)![0].children : editor.children) as TElement[];
    const last = children.at(-1);
    if (last?.type === KEYS.p) {
        editor.tf.select(editor.api.end([...containerPath, children.length - 1]));
        editor.tf.focus();
    } else {
        insertBlock(editor, {type: KEYS.p, children: [{text: ''}]}, [...containerPath, children.length]);
    }
}

function isInColumn(editor: PlateEditor, path: Path) {
    return path.length > 1 && editor.api.parent(path)?.[0].type === KEYS.column;
}

/** The movable block (see isMovableBlock) holding `path`. */
function movableBlockOf(editor: PlateEditor, path: Path): Path {
    return path.length >= 3 && isInColumn(editor, path.slice(0, 3)) ? path.slice(0, 3) : path.slice(0, 1);
}

/**
 * Inserts the block picked in the menu that typing `/` (or `[[`, `length` 2) at `at` opened; those characters go.
 * A link goes at the cursor. A block takes the place of the line when nothing else is on it, as in Notion, and
 * otherwise goes below the block holding the line.
 */
export function insertAtSlash(editor: PlateEditor, at: Point, node: TElement, length = 1) {
    editor.tf.withoutNormalizing(() => {
        editor.tf.delete({at: {anchor: at, focus: {...at, offset: at.offset + length}}});
        if (editor.api.isInline(node)) {
            editor.tf.select(at);
            editor.tf.insertNodes(node);
            const link = editor.api.above({match: (n) => ElementApi.isElement(n) && editor.api.isInline(n)});
            const after = link && editor.api.after(link[1]);
            if (after) editor.tf.select(after);
            editor.tf.focus();
            return;
        }
        const path = movableBlockOf(editor, at.path);
        const [block] = editor.api.node<TElement>(path)!;
        if (block.type === KEYS.p && !block.listStyleType && editor.api.isEmpty(block)) {
            editor.tf.removeNodes({at: path});
            insertBlock(editor, node, path);
        } else {
            insertBlock(editor, node, PathApi.next(path));
        }
    });
}

export function getEntries(editor: PlateEditor, ids: string[]) {
    return ids
        .map(id => editor.api.node<TElement>({id, at: []}))
        .filter((entry): entry is NodeEntry<TElement> => !!entry)
        .sort(([, a], [, b]) => PathApi.compare(a, b));
}

// A row whose blocks are all selected is dragged as the row, so it keeps its columns.
export function withFullRows(editor: PlateEditor, ids: string[]) {
    const selected = new Set(ids);
    const result: string[] = [];
    for (const [node, path] of getEntries(editor, ids)) {
        const row = path.length === 3 ? editor.api.node<TElement>(path.slice(0, 1))![0] : undefined;
        const rowBlocks = row?.children.flatMap(column => (column as TElement).children as TElement[]);
        if (!row || !rowBlocks!.every(block => selected.has(block.id as string))) result.push(node.id as string);
        else if (!result.includes(row.id as string)) result.push(row.id as string);
    }
    return result;
}

export function canDrop(editor: PlateEditor, dragIds: string[], targetId: string, side: Side) {
    const drags = getEntries(editor, dragIds);
    const target = editor.api.node<TElement>({id: targetId, at: []});
    if (drags.length === 0 || !target) return false;
    if (drags.some(([, path]) => PathApi.equals(path, target[1]) || PathApi.isAncestor(path, target[1]))) return false;
    const sideDrop = side === 'left' || side === 'right';
    // Rows don't nest: a column group may only move between top-level blocks.
    const landsInColumn = sideDrop || isInColumn(editor, target[1]);
    if (landsInColumn && drags.some(([node]) => node.type === KEYS.columnGroup)) return false;
    if (!sideDrop) return true;
    const row = target[0].type === KEYS.columnGroup ? target[0]
        : isInColumn(editor, target[1]) ? editor.api.node<TElement>(target[1].slice(0, -2))?.[0] : undefined;
    return !row || row.children.length < MAX_COLUMNS;
}

// The new column takes half of the column it lands beside; if that one is too narrow, the row is re-split evenly.
function insertColumn(editor: PlateEditor, groupPath: Path, neighbour: number, side: Side, blocks: TElement[]) {
    const group = editor.api.node<TElement>(groupPath)![0];
    const spans = (group.children as TColumnElement[]).map(spanOf);
    const index = side === 'left' ? neighbour : neighbour + 1;
    let next: number[];
    if (spans[neighbour] >= 2 * MIN_COLUMN_SPAN) {
        const half = Math.floor(spans[neighbour] / 2);
        next = spans.map((s, i) => i === neighbour ? s - half : s);
        next.splice(index, 0, half);
    } else {
        next = evenSpans(spans.length + 1);
    }
    editor.tf.insertNodes({type: KEYS.column, width: spanToWidth(next[index]), children: blocks}, {at: [...groupPath, index]});
    next.forEach((s, i) => editor.tf.setNodes<TColumnElement>({width: spanToWidth(s)}, {at: [...groupPath, i]}));
}

// Removes a block; a column it leaves empty is removed too and its span goes to a neighbour,
// so the row stays on the grid (Plate's own cleanup would spread it as a fraction).
export function removeBlock(editor: PlateEditor, path: Path) {
    const column = isInColumn(editor, path) ? editor.api.parent<TColumnElement>(path) : undefined;
    editor.tf.removeNodes({at: path});
    if (!column || column[0].children.length > 1) return;
    const [emptyColumn, columnPath] = column;
    const index = columnPath[columnPath.length - 1];
    const neighbourPath = index > 0 ? PathApi.previous(columnPath)! : PathApi.next(columnPath);
    const neighbour = editor.api.node<TColumnElement>(neighbourPath);
    if (neighbour) {
        editor.tf.setNodes<TColumnElement>({width: spanToWidth(spanOf(neighbour[0]) + spanOf(emptyColumn))}, {at: neighbourPath});
    }
    editor.tf.removeNodes({at: columnPath});
}

// While blocks are selected, Plate's block selection redirects editor.tf.setNodes to the selected blocks,
// which a move has just taken out. So the selection is set aside for the edit and handed back.
export function withoutBlockSelection(editor: PlateEditor, edit: () => void) {
    const blockSelection = editor.getApi(BlockSelectionPlugin).blockSelection;
    const selected = blockSelection.getNodes().map(([node]) => node.id);
    blockSelection.clear();
    editor.tf.withoutNormalizing(edit);
    return selected;
}

// Moves the dragged blocks, in document order, next to the target; beside it they share one new column.
export function moveBlocks(editor: PlateEditor, dragIds: string[], targetId: string, side: Side) {
    const selected = withoutBlockSelection(editor, () => {
        const drags = getEntries(editor, dragIds);
        const blocks = drags.map(([node]) => node);
        // Back to front, so removing one never shifts the paths of the ones still to go.
        [...drags].reverse().forEach(([, path]) => removeBlock(editor, path));
        const [targetNode, targetPath] = editor.api.node<TElement>({id: targetId, at: []})!;

        if (side === 'top' || side === 'bottom') {
            editor.tf.insertNodes(blocks, {at: side === 'top' ? targetPath : PathApi.next(targetPath)});
        } else if (targetNode.type === KEYS.columnGroup) {
            insertColumn(editor, targetPath, side === 'left' ? 0 : targetNode.children.length - 1, side, blocks);
        } else if (isInColumn(editor, targetPath)) {
            const columnPath = PathApi.parent(targetPath);
            insertColumn(editor, PathApi.parent(columnPath), columnPath[columnPath.length - 1], side, blocks);
        } else {
            editor.tf.removeNodes({at: targetPath});
            editor.tf.insertNodes(createColumnGroup(...(side === 'left' ? [blocks, targetNode] : [targetNode, blocks])), {at: targetPath});
        }
    });
    if (selected.length > 0) editor.getApi(BlockSelectionPlugin).blockSelection.set(selected);
}
