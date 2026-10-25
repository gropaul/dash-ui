import {describe, expect, it} from 'vitest';
import {createSlateEditor, KEYS, TElement} from "platejs";
import {BaseColumnPlugin} from "@platejs/layout";
import {BaseListPlugin} from "@platejs/list";
import {BaseIndentPlugin} from "@platejs/indent";
import {BaseBlockquotePlugin} from "@platejs/basic-nodes";
import remarkGfm from "remark-gfm";
import {MarkdownPlugin, remarkMdx} from "@platejs/markdown";
import {relationToFence, pageMarkdownRules, parseRelationFence, serializePage} from "@/components/page-editor/markdown";
import {RELATION_BLOCK_KEY, TRelationBlock} from "@/components/page-editor/model";

const MARKDOWN = `# Title

<columngroup>
<column span="8">

\`\`\`sql revenue
-- view: bar
-- x: month
-- y: revenue
-- rows: 5
SELECT 1 AS month, 2 AS revenue
\`\`\`

</column>
<column span="4">

Some text

</column>
</columngroup>

\`\`\`sql
SELECT 'plain code'
\`\`\`
`;

function createEditor() {
    // Block ids are on in the app (Plate turns them off under test), and must not end up in the markdown.
    return createSlateEditor({
        nodeId: true,
        plugins: [
            BaseColumnPlugin, BaseIndentPlugin, BaseListPlugin, BaseBlockquotePlugin,
            MarkdownPlugin.configure({options: {remarkPlugins: [remarkGfm, remarkMdx], rules: pageMarkdownRules}}),
        ],
    });
}

describe('chart fence header', () => {
    it('reads the settings from leading SQL comments', () => {
        const chart = parseRelationFence('sql', '-- view: line\n-- x: day\n-- rows: 3\nSELECT 1');
        expect(chart).toMatchObject({type: RELATION_BLOCK_KEY, sql: 'SELECT 1', header: {view: 'line', x: 'day'}, rows: 3});
    });

    it('leaves a sql fence without a chart line alone', () => {
        expect(parseRelationFence('sql', '-- just a comment\nSELECT 1')).toBeUndefined();
        expect(parseRelationFence('python', '-- view: bar')).toBeUndefined();
    });

    it('writes the header back with rows last', () => {
        const chart = parseRelationFence('sql', '-- view: bar\n-- rows: 2\n-- x: a\nSELECT 1')!;
        expect(relationToFence(chart)).toBe('-- view: bar\n-- x: a\n-- rows: 2\nSELECT 1');
    });
});

describe('block names', () => {
    it('are read from and written to the fence info string', () => {
        const markdown = '```sql monthly_revenue\n-- view: bar\n-- rows: 6\nSELECT 1\n```\n';
        const editor = createEditor();
        const value = editor.getApi(MarkdownPlugin).markdown.deserialize(markdown);
        expect(value[0]).toMatchObject({type: RELATION_BLOCK_KEY, name: 'monthly_revenue'});
        expect(serializePage(editor, value)).toBe(markdown);
    });
});

describe('input blocks', () => {
    it('are written without rows, as their height is fixed', () => {
        const dropdown = parseRelationFence('sql', '-- view: select\n-- column: region\nSELECT 1')!;
        expect(relationToFence(dropdown)).toBe('-- view: select\n-- column: region\nSELECT 1');
    });
});

describe('dashboard markdown', () => {
    it('turns fences into charts and column spans into widths', () => {
        const editor = createEditor();
        const value = editor.getApi(MarkdownPlugin).markdown.deserialize(MARKDOWN) as TElement[];

        const group = value.find(node => node.type === KEYS.columnGroup)!;
        const [left, right] = group.children as TElement[];
        expect(left.width).toBe(`${8 / 12 * 100}%`);
        expect(right.width).toBe(`${4 / 12 * 100}%`);
        expect((left.children[0] as TRelationBlock)).toMatchObject({type: RELATION_BLOCK_KEY, rows: 5, name: 'revenue', header: {view: 'bar'}});
        expect(value.at(-1)!.type).toBe(KEYS.codeBlock);
    });

    it('round-trips charts and spans', () => {
        const editor = createEditor();
        editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(MARKDOWN));
        const markdown = editor.getApi(MarkdownPlugin).markdown.serialize();

        expect(markdown).toContain('<column span="8">');
        expect(markdown).toContain('<column span="4">');
        // Content inside the column tags is indented by the serializer.
        const unindented = markdown.split('\n').map(line => line.trim()).join('\n');
        expect(unindented).toContain('```sql revenue\n-- view: bar\n-- x: month\n-- y: revenue\n-- rows: 5\nSELECT 1 AS month, 2 AS revenue');
        expect(markdown).toContain("SELECT 'plain code'");

        // The split view compares text and document by serializing a value without loading it.
        const parsed = editor.getApi(MarkdownPlugin).markdown.deserialize(MARKDOWN);
        expect(createEditor().getApi(MarkdownPlugin).markdown.serialize({value: parsed})).toBe(markdown);

        const again = createEditor();
        again.tf.setValue(again.getApi(MarkdownPlugin).markdown.deserialize(markdown));
        expect(again.getApi(MarkdownPlugin).markdown.serialize()).toBe(markdown);
    });

    it('round-trips the text blocks the GUI offers', () => {
        const text = `- one\n- two\n\n1. first\n2. second\n\n- [ ] open\n- [x] done\n\n> quoted\n`;
        const editor = createEditor();
        editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(text));
        const markdown = editor.getApi(MarkdownPlugin).markdown.serialize();

        expect(markdown).toContain('* one');
        expect(markdown).toContain('1. first');
        expect(markdown).toContain('* [ ] open');
        expect(markdown).toContain('* [x] done');
        expect(markdown).toContain('> quoted');
        expect(markdown).not.toContain('id=');
    });
});

describe('empty text block at the end', () => {
    // Clicking below the last block adds one to type into; until something is typed it is no content, and the
    // markdown must stay the same, or the split view would write the text back.
    it('does not change the markdown', () => {
        const markdown = 'Text\n\n```sql\n-- view: bar\n-- rows: 6\nSELECT 1\n```\n';
        const editor = createSlateEditor({
            nodeId: true,
            plugins: [MarkdownPlugin.configure({options: {remarkPlugins: [remarkMdx], rules: pageMarkdownRules}})],
        });
        const value = editor.getApi(MarkdownPlugin).markdown.deserialize(markdown);
        const before = serializePage(editor, value);
        editor.tf.setValue(value);
        editor.tf.insertNodes({type: KEYS.p, children: [{text: ''}]}, {at: [editor.children.length]});
        expect(serializePage(editor)).toBe(before);
    });
});

describe('blocks taking a query in', () => {
    it('are read from an input line, without a view or SQL of their own', () => {
        const block = parseRelationFence('sql', '-- input: ../Orders.sql\n-- rows: 4', 'orders')!;
        expect(block).toMatchObject({type: RELATION_BLOCK_KEY, name: 'orders', sql: '', header: {input: '../Orders.sql'}, rows: 4});
        expect(relationToFence(block)).toBe('-- input: ../Orders.sql\n-- rows: 4');
    });
});
