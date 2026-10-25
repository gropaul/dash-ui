import {describe, expect, it, vi} from 'vitest';
import {EditorFolder} from "@/model/editor-folder";

// Fonts load through Next, which the editor's modules import somewhere down the line.
vi.mock("next/font/google", () => ({Sometype_Mono: () => ({className: '', style: {}})}));
vi.mock("@/state/connections/connections-service", () => ({
    ConnectionsService: {getInstance: () => ({executeQuery: async () => [], onDatabaseConnectionChange: () => () => undefined})},
}));

const {movePageLinks} = await import("@/components/page-editor/page-links");

const node = (id: string, type: string, name: string, children: EditorFolder[] | null = null) =>
    ({id, type, name, children}) as EditorFolder;

const tree = (salesName: string, folderName: string) => [
    node('home', 'dashboards', 'Home'),
    node('q3', 'folder', folderName, [node('sales', 'dashboards', salesName)]),
];

describe('links after a rename', () => {
    const markdown = 'See [Sales](<Q3/Sales.md>), [the numbers](<Q3/Sales.md>) and [web](https://example.org).\n';

    it('follow the page, and show its new name unless they had their own text', () => {
        expect(movePageLinks(markdown, 'home', tree('Sales', 'Q3'), tree('Revenue', 'Q3')))
            .toBe('See [Revenue](Q3/Revenue.md), [the numbers](Q3/Revenue.md) and [web](https://example.org).\n');
    });

    it('follow a renamed folder', () => {
        expect(movePageLinks(markdown, 'home', tree('Sales', 'Q3'), tree('Sales', 'Third quarter')))
            .toBe('See [Sales](<Third quarter/Sales.md>), [the numbers](<Third quarter/Sales.md>) and [web](https://example.org).\n');
    });

    it('follow a page moved to another folder, and the moved page\'s own links too', () => {
        const moved = [node('home', 'dashboards', 'Home'), node('q3', 'folder', 'Q3', []), node('sales', 'dashboards', 'Sales')];
        expect(movePageLinks(markdown, 'home', tree('Sales', 'Q3'), moved))
            .toBe('See [Sales](Sales.md), [the numbers](Sales.md) and [web](https://example.org).\n');
        expect(movePageLinks('Back [Home](../Home.md)\n', 'sales', tree('Sales', 'Q3'), moved)).toBe('Back [Home](Home.md)\n');
    });

    it('move a block\'s input to where the query is now', () => {
        const queries = (folder: string) => [node('home', 'dashboards', 'Home'), node('q3', 'folder', folder, [node('orders', 'relations', 'Orders')])];
        const page = '```sql orders\n-- input: Q3/Orders.sql\n-- rows: 6\n```\n';
        expect(movePageLinks(page, 'home', queries('Q3'), queries('Third quarter')))
            .toBe('```sql orders\n-- input: Third quarter/Orders.sql\n-- rows: 6\n```\n');
    });

    it('leave a page without changed links as it is', () => {
        expect(movePageLinks(markdown, 'home', tree('Sales', 'Q3'), tree('Sales', 'Q3'))).toBe(markdown);
    });
});
