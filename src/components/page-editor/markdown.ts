import {KEYS, SlateEditor, TElement, Value} from "platejs";
import {
    convertChildrenDeserialize,
    convertNodesSerialize,
    defaultRules,
    MarkdownPlugin,
    MdMdxJsxFlowElement,
    MdRules,
} from "@platejs/markdown";
import {
    createRelationBlock,
    DEFAULT_BLOCK_ROWS,
    GRID_COLUMNS,
    isInputBlock,
    RELATION_BLOCK_KEY,
    spanOf,
    spanToWidth,
    TColumnElement,
    TRelationBlock,
} from "@/components/page-editor/model";
import {joinHeader, splitHeader} from "@/state/workspace/relation-config";

/**
 * A relation block is a plain ```sql fence, optionally named after the language (```sql revenue_per_month),
 * whose leading SQL comments hold its settings, so the block stays runnable SQL:
 *
 *     -- view: bar             (a plot type, or table / text / select / slider)
 *     -- x: month
 *     -- y: revenue
 *     -- settings: {...}       (optional: the views' setup beyond the keys above, as JSON)
 *     -- rows: 6               (height in grid rows; inputs have none)
 *     SELECT ...
 *
 * A block can take in a query of the project, a `.sql` file in the same format, by its path relative to the page;
 * it takes the query's SQL and view, and its own keys override the view:
 *
 *     -- input: ../sales/orders.sql
 *     -- view: line
 *
 * A sql fence without a `view` or `input` line stays an ordinary code block. Columns are
 * `<column span="6">`, in grid columns out of 12, inside a `<columngroup>` row.
 */
const COLUMN_GROUP_TAG = 'columngroup';

export function parseRelationFence(lang: string | null | undefined, value: string, meta?: string | null): TRelationBlock | undefined {
    if (lang !== 'sql') return;
    const {header: {rows, ...header}, sql} = splitHeader(value);
    if (!header.view && !header.input) return;
    return createRelationBlock(sql.trim(), header, Number(rows) || DEFAULT_BLOCK_ROWS, meta?.trim() || undefined);
}

export function relationToFence(block: TRelationBlock): string {
    return joinHeader(isInputBlock(block) ? block.header : {...block.header, rows: String(block.rows)}, block.sql);
}

function attribute(mdastNode: MdMdxJsxFlowElement, name: string): string | undefined {
    const value = mdastNode.attributes.find(a => a.type === 'mdxJsxAttribute' && a.name === name)?.value;
    return typeof value === 'string' ? value : undefined;
}

export const pageMarkdownRules: MdRules = {
    code_block: {
        deserialize: (mdastNode, deco, options) =>
            parseRelationFence(mdastNode.lang, mdastNode.value ?? '', mdastNode.meta) ?? defaultRules.code_block!.deserialize!(mdastNode, deco, options),
    },
    [RELATION_BLOCK_KEY]: {
        serialize: (node: TRelationBlock) => ({type: 'code', lang: 'sql', meta: node.name ?? null, value: relationToFence(node)}),
    },
    column: {
        deserialize: (mdastNode, deco, options) => ({
            type: KEYS.column,
            width: spanToWidth(Number(attribute(mdastNode, 'span')) || GRID_COLUMNS),
            children: convertChildrenDeserialize(mdastNode.children, deco, options),
        }),
        serialize: (node: TColumnElement, options) => ({
            type: 'mdxJsxFlowElement',
            name: 'column',
            attributes: [{type: 'mdxJsxAttribute', name: 'span', value: String(spanOf(node))}],
            children: convertNodesSerialize(node.children, options),
        }),
    },
    // A row is `<columngroup>`; IntelliJ's markdown support rejects Plate's `<columngroup>`.
    [KEYS.columnGroup]: {
        serialize: (node: TElement, options) => ({
            type: 'mdxJsxFlowElement',
            name: COLUMN_GROUP_TAG,
            attributes: [],
            children: convertNodesSerialize(node.children, options),
        }),
    },
    [COLUMN_GROUP_TAG]: {
        deserialize: (mdastNode, deco, options) => ({
            type: KEYS.columnGroup,
            children: convertChildrenDeserialize(mdastNode.children, deco, options),
        }),
    },
};

/**
 * The page's markdown. Plate writes an empty paragraph as a zero-width space; the ones at the very end, like one
 * added by clicking below the last block, are not content and are left out.
 */
export function serializePage(editor: SlateEditor, value?: Value): string {
    const markdown = editor.getApi(MarkdownPlugin).markdown.serialize(value ? {value} : undefined);
    return markdown.replace(/(?:\s*\u200B)+\s*$/, '\n');
}
