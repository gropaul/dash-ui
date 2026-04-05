import {describe, expect, it} from 'vitest';
import {walkAst, AstHighlight} from './register-ast-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function highlights(node: any, sql: string): AstHighlight[] {
    const result: AstHighlight[] = [];
    walkAst(node, result, sql);
    return result;
}

function token(sql: string, h: AstHighlight): string {
    return sql.slice(h.startOffset, h.startOffset + h.length);
}

// ---------------------------------------------------------------------------
// BASE_TABLE
// ---------------------------------------------------------------------------

describe('walkAst — BASE_TABLE', () => {
    it('highlights a plain table name', () => {
        const sql = 'SELECT 1 FROM orders';
        const node = {type: 'BASE_TABLE', table_name: 'orders', query_location: 14};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(hs[0]).toMatchObject({kind: 'table', startOffset: 14, length: 6});
        expect(token(sql, hs[0])).toBe('orders');
    });

    it('skips the catalog and schema prefix', () => {
        const sql = 'SELECT 1 FROM main.public.orders';
        const node = {type: 'BASE_TABLE', table_name: 'orders', catalog_name: 'main', schema_name: 'public', query_location: 14};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(token(sql, hs[0])).toBe('orders');
    });

    it('skips only schema prefix when no catalog', () => {
        const sql = 'SELECT 1 FROM public.orders';
        const node = {type: 'BASE_TABLE', table_name: 'orders', schema_name: 'public', query_location: 14};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(token(sql, hs[0])).toBe('orders');
    });
});

// ---------------------------------------------------------------------------
// TABLE_FUNCTION
// ---------------------------------------------------------------------------

describe('walkAst — TABLE_FUNCTION', () => {
    it('highlights the full macro call including args', () => {
        const sql = 'SELECT * FROM node_trains()';
        const node = {
            type: 'TABLE_FUNCTION',
            function: {function_name: 'node_trains', query_location: 14},
        };
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(hs[0].kind).toBe('table');
        expect(token(sql, hs[0])).toBe('node_trains()');
    });

    it('includes args in the span', () => {
        const sql = "SELECT * FROM node_trains(param := 'foo')";
        const node = {
            type: 'TABLE_FUNCTION',
            function: {function_name: 'node_trains', query_location: 14},
        };
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(token(sql, hs[0])).toBe("node_trains(param := 'foo')");
    });
});

// ---------------------------------------------------------------------------
// COLUMN_REF — plain identifiers
// ---------------------------------------------------------------------------

describe('walkAst — COLUMN_REF plain', () => {
    it('highlights a plain column name', () => {
        const sql = 'SELECT amount FROM orders';
        const node = {type: 'COLUMN_REF', column_names: ['amount'], query_location: 7};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(hs[0]).toMatchObject({kind: 'column', startOffset: 7, length: 6});
        expect(token(sql, hs[0])).toBe('amount');
    });

    it('skips qualifier prefixes for table.column', () => {
        const sql = 'SELECT t.amount FROM t';
        // column_names: ['t', 'amount'], query_location points to 't' at offset 7
        const node = {type: 'COLUMN_REF', column_names: ['t', 'amount'], query_location: 7};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        // prefix 't' (1 char) + '.' (1 char) = 2, so leaf starts at 7 + 2 = 9
        expect(token(sql, hs[0])).toBe('amount');
    });
});

// ---------------------------------------------------------------------------
// COLUMN_REF — quoted identifiers
// ---------------------------------------------------------------------------

describe('walkAst — COLUMN_REF quoted identifiers', () => {
    it('includes surrounding double-quotes in the span', () => {
        const sql = 'SELECT "# Trains" FROM t';
        // DuckDB AST stores unquoted name: '# Trains' (length 8); SQL has '"# Trains"' (length 10)
        const node = {type: 'COLUMN_REF', column_names: ['# Trains'], query_location: 7};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(hs[0].length).toBe(10); // 8 + 2 quotes
        expect(token(sql, hs[0])).toBe('"# Trains"');
    });

    it('handles quoted identifier with spaces and special chars', () => {
        const sql = 'SELECT "count(*)" FROM t';
        const node = {type: 'COLUMN_REF', column_names: ['count(*)'], query_location: 7};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(token(sql, hs[0])).toBe('"count(*)"');
    });

    it('handles plain identifier that looks similar to a quoted one', () => {
        const sql = 'SELECT trains FROM t';
        const node = {type: 'COLUMN_REF', column_names: ['trains'], query_location: 7};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        expect(hs[0].length).toBe(6); // no quotes added
        expect(token(sql, hs[0])).toBe('trains');
    });

    it('quoted column after qualifier: table."# Trains"', () => {
        const sql = 'SELECT t."# Trains" FROM t';
        // column_names: ['t', '# Trains'], query_location = 7 (points to 't')
        const node = {type: 'COLUMN_REF', column_names: ['t', '# Trains'], query_location: 7};
        const hs = highlights(node, sql);
        expect(hs).toHaveLength(1);
        // prefix 't.' = 2 chars; leaf starts at 9
        expect(token(sql, hs[0])).toBe('"# Trains"');
    });
});

// ---------------------------------------------------------------------------
// Recursion
// ---------------------------------------------------------------------------

describe('walkAst — recursion', () => {
    it('collects highlights from nested nodes', () => {
        const sql = 'SELECT amount FROM orders';
        const ast = {
            type: 'SELECT_NODE',
            select_list: [
                {type: 'COLUMN_REF', column_names: ['amount'], query_location: 7},
            ],
            from_table: {type: 'BASE_TABLE', table_name: 'orders', query_location: 18},
        };
        const hs = highlights(ast, sql);
        expect(hs).toHaveLength(2);
        const kinds = hs.map(h => h.kind);
        expect(kinds).toContain('column');
        expect(kinds).toContain('table');
    });

    it('handles null/primitive children without throwing', () => {
        const node = {type: 'WHATEVER', child: null, value: 42, name: 'x'};
        expect(() => highlights(node, 'SELECT 1')).not.toThrow();
    });
});
