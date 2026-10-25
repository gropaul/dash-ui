import {describe, expect, it} from 'vitest';
import {rewriteReferences} from "@/state/workspace/rewrite-references";

const files = {
    'Overview.md': '# Overview\n\nSee [Q3](Sales/Q3.md) and [the plan](<Sales/Year plan.md>).\n\n```sql chart\n-- input: Sales/orders.sql\n-- view: bar\n```\n',
    'Sales/Q3.md': '[Back](../Overview.md)\n\n```sql top\n-- view: table\nSELECT * FROM refs.orders()\n```\n',
    'Sales/Year plan.md': '# Plan\n',
    'Sales/orders.sql': 'SELECT 1',
    'totals.sql': "SELECT * FROM refs.orders() -- refs.orders() in a comment stays\n",
    'Notes.md': '```js\n[x](Sales/Q3.md)\n```\n\n[Plan](./Sales/Year%20plan.md)\n',
};

describe('rewriteReferences', () => {
    it('points links and inputs at a moved folder, from where each page ends up', () => {
        const changes = rewriteReferences(files, 'Sales', 'Archive/Sales');
        expect(changes['Overview.md']).toContain('[Q3](Archive/Sales/Q3.md)');
        expect(changes['Overview.md']).toContain('[the plan](<Archive/Sales/Year plan.md>)');
        expect(changes['Overview.md']).toContain('-- input: Archive/Sales/orders.sql');
        expect(changes['Archive/Sales/Q3.md']).toContain('[Back](../../Overview.md)');
        // Moving doesn't rename a query, so no SQL changes; fences other than sql are left alone.
        expect(changes['totals.sql']).toBeUndefined();
        expect(changes['Notes.md']).toBe('```js\n[x](Sales/Q3.md)\n```\n\n[Plan](<Archive/Sales/Year plan.md>)\n');
    });

    it('renames a query\'s refs and a page\'s name in links that show it', () => {
        const query = rewriteReferences(files, 'Sales/orders.sql', 'Sales/sales_orders.sql');
        expect(query['totals.sql']).toBe("SELECT * FROM refs.sales_orders() -- refs.orders() in a comment stays\n");
        expect(query['Sales/Q3.md']).toContain('FROM refs.sales_orders()');
        expect(query['Overview.md']).toContain('-- input: Sales/sales_orders.sql');

        const page = rewriteReferences(files, 'Sales/Q3.md', 'Sales/Q4.md');
        expect(page['Overview.md']).toContain('See [Q4](Sales/Q4.md)');
        // Links that still lead where they did stay as written.
        expect(Object.keys(page)).toEqual(['Overview.md']);
    });
});
