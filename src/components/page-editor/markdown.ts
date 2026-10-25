import {KEYS, SlateEditor, Value} from "platejs";
import {
    convertChildrenDeserialize,
    convertNodesSerialize,
    defaultRules,
    MarkdownPlugin,
    MdMdxJsxFlowElement,
    MdRules,
} from "@platejs/markdown";
import {
    createReferenceBlock,
    createRelationBlock,
    DEFAULT_BLOCK_ROWS,
    GRID_COLUMNS,
    isInputBlock,
    isReferenceBlock,
    RELATION_BLOCK_KEY,
    spanOf,
    spanToWidth,
    TColumnElement,
    TRelationBlock,
} from "@/components/page-editor/model";

/**
 * A relation block is a plain ```sql fence, optionally named after the language (```sql revenue_per_month),
 * whose leading SQL comments hold its settings, so the block stays runnable SQL:
 *
 *     -- view: bar             (a plot type, or table / text / select / slider)
 *     -- x: month
 *     -- y: revenue
 *     -- settings: {...}       (optional: the complete view settings as JSON; the keys above override it)
 *     -- rows: 6               (height in grid rows; inputs have none)
 *     SELECT ...
 *
 * A block can take in a query of the project, a `.sql` file in the same format, by its path relative to the page;
 * it takes the query's SQL and view, and its own keys override the view:
 *
 *     -- input: ../sales/orders.sql
 *     -- view: line
 *
 * A block that shows a relation of the project is a reference, without SQL:
 *
 *     -- relation: relation-query-local-abc
 *     -- rows: 6
 *
 * A sql fence without a `view`, `input` or `relation` line stays an ordinary code block. Columns are
 * `<column span="6">`, in grid columns out of 12.
 */
const HEADER_LINE = /^--\s*([\w-]+):\s*(.*)$/;

export function parseRelationFence(lang: string | null | undefined, value: string, meta?: string | null): TRelationBlock | undefined {
    if (lang !== 'sql') return;
    const lines = value.split('\n');
    const header: Record<string, string> = {};
    let i = 0;
    for (; i < lines.length; i++) {
        const match = HEADER_LINE.exec(lines[i].trim());
        if (!match) break;
        header[match[1]] = match[2].trim();
    }
    const {rows, relation, ...rest} = header;
    const height = Number(rows) || DEFAULT_BLOCK_ROWS;
    if (relation) return createReferenceBlock(relation, height);
    if (!rest.view && !rest.input) return;
    return createRelationBlock(lines.slice(i).join('\n').trim(), rest, height, meta?.trim() || undefined);
}

export function relationToFence(block: TRelationBlock): string {
    const header: Record<string, string> = isReferenceBlock(block) ? {relation: block.relationId!} : {...block.header};
    if (!isInputBlock(block)) header.rows = String(block.rows);
    const lines = Object.entries(header).map(([key, value]) => `-- ${key}: ${value}`);
    return [...lines, block.sql].filter(Boolean).join('\n');
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
};

/**
 * The page's markdown. Plate writes an empty paragraph as a zero-width space; the ones at the very end, like one
 * added by clicking below the last block, are not content and are left out.
 */
export function serializePage(editor: SlateEditor, value?: Value): string {
    const markdown = editor.getApi(MarkdownPlugin).markdown.serialize(value ? {value} : undefined);
    return markdown.replace(/(?:\s*\u200B)+\s*$/, '\n');
}
