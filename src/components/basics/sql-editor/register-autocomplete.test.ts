import {describe, expect, it, vi} from 'vitest';

// Mock heavy state modules that are imported transitively but not needed for these pure functions
vi.mock('@/state/database.state', () => ({
    useDatabaseState: {getState: () => ({keywords: [], refresh: async () => {}})},
    binarySearchByName: () => -1,
}));

import {extractReferencedTableNames, stripComments} from './register-autocomplete';

describe('stripComments', () => {
    it('replaces single-line comments with spaces (preserving length)', () => {
        const sql = 'SELECT 1 -- comment\nFROM t';
        const result = stripComments(sql);
        expect(result).toContain('FROM t');
        // comment text replaced with spaces, newline preserved
        expect(result.indexOf('\n')).toBe(sql.indexOf('\n'));
        expect(result).not.toContain('-- comment');
    });

    it('replaces block comments with spaces', () => {
        const result = stripComments('SELECT /* block */ 1');
        expect(result).not.toContain('block');
        expect(result).toContain('SELECT');
        expect(result).toContain('1');
    });

    it('preserves newlines inside block comments', () => {
        const sql = 'SELECT /*\nblock\n*/ 1';
        const result = stripComments(sql);
        // newlines inside block comment are preserved so line numbers don't shift
        expect(result.split('\n').length).toBe(sql.split('\n').length);
    });

    it('does not treat content inside single-quoted strings as comments (replaces with spaces, preserves delimiters)', () => {
        const sql = "SELECT '-- not a comment' FROM t";
        const result = stripComments(sql);
        // String delimiters are kept; content is blanked to preserve offsets
        expect(result).toContain("'");
        expect(result).not.toContain('-- not a comment');
        expect(result.length).toBe(sql.length);
    });

    it('does not treat content inside double-quoted identifiers as comments (replaces with spaces, preserves delimiters)', () => {
        const sql = 'SELECT "col -- name" FROM t';
        const result = stripComments(sql);
        // Double-quote delimiters are kept; content is blanked to preserve offsets
        expect(result).toContain('"');
        expect(result).not.toContain('col -- name');
        expect(result.length).toBe(sql.length);
    });

    it('handles empty string', () => {
        expect(stripComments('')).toBe('');
    });

    it('handles SQL with no comments', () => {
        const sql = 'SELECT id, name FROM users WHERE id = 1';
        expect(stripComments(sql)).toBe(sql);
    });
});

describe('extractReferencedTableNames', () => {
    it('extracts table after FROM', () => {
        expect(extractReferencedTableNames('SELECT * FROM orders')).toContain('orders');
    });

    it('extracts table after JOIN', () => {
        const names = extractReferencedTableNames('SELECT * FROM orders JOIN users ON orders.user_id = users.id');
        expect(names).toContain('orders');
        expect(names).toContain('users');
    });

    it('handles schema-qualified names (takes only table part)', () => {
        const names = extractReferencedTableNames('SELECT * FROM memory.main.orders');
        expect(names).toContain('orders');
        expect(names).not.toContain('memory.main.orders');
    });

    it('deduplicates repeated references', () => {
        const names = extractReferencedTableNames('SELECT * FROM t JOIN t ON t.id = t.id');
        expect(names.filter(n => n === 't').length).toBe(1);
    });

    it('ignores SQL keywords after FROM/JOIN (stop words)', () => {
        const names = extractReferencedTableNames('SELECT * FROM orders WHERE id = 1 GROUP BY id');
        expect(names).not.toContain('WHERE');
        expect(names).not.toContain('GROUP');
    });

    it('returns empty array when no FROM/JOIN', () => {
        expect(extractReferencedTableNames('SELECT 1 + 1')).toEqual([]);
    });

    it('is case-insensitive for FROM and JOIN keywords', () => {
        const names = extractReferencedTableNames('select * from orders join users on true');
        expect(names).toContain('orders');
        expect(names).toContain('users');
    });

    it('handles subqueries (extracts inner table)', () => {
        const names = extractReferencedTableNames('SELECT * FROM (SELECT id FROM orders) sub');
        expect(names).toContain('orders');
    });
});
