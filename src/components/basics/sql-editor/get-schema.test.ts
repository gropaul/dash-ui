import {describe, expect, it} from 'vitest';
import {binarySearchByName, normalizeIdentifier} from './schema-utils';

describe('normalizeIdentifier', () => {
    it('lowercases plain names', () => {
        expect(normalizeIdentifier('MyTable')).toBe('mytable');
        expect(normalizeIdentifier('ORDERS')).toBe('orders');
    });

    it('strips surrounding double quotes', () => {
        expect(normalizeIdentifier('"MyTable"')).toBe('mytable');
        expect(normalizeIdentifier('"# Trains"')).toBe('# trains');
    });

    it('only strips leading and trailing quote, not inner quotes', () => {
        expect(normalizeIdentifier('"he said ""hello"""')).toBe('he said ""hello""');
    });

    it('handles names with special characters', () => {
        expect(normalizeIdentifier('"# Revenue"')).toBe('# revenue');
        expect(normalizeIdentifier('"count(*)"')).toBe('count(*)');
    });

    it('handles already-lowercase names without quotes', () => {
        expect(normalizeIdentifier('users')).toBe('users');
    });

    it('strips trailing () from macro call tokens', () => {
        expect(normalizeIdentifier('node_trains()')).toBe('node_trains');
        expect(normalizeIdentifier('"node_trains"()')).toBe('node_trains');
    });

    it('handles empty string', () => {
        expect(normalizeIdentifier('')).toBe('');
    });

    it('handles string with only quotes', () => {
        expect(normalizeIdentifier('""')).toBe('');
    });
});

// ---------------------------------------------------------------------------
// Helpers to build test fixtures without DuckDB
// ---------------------------------------------------------------------------

function col(name: string, type = 'VARCHAR') {
    return {name, escapedName: normalizeIdentifier(name), type};
}

function table(name: string, columns: ReturnType<typeof col>[] = []) {
    return {name, escapedName: normalizeIdentifier(name), type: 'ordinary' as const, children: columns};
}

describe('binarySearchByName', () => {
    const tables = [
        table('"# Trains"'),
        table('orders'),
        table('users'),
        table('products'),
        table('shipments'),
    ].sort((a, b) => a.escapedName.localeCompare(b.escapedName));
    // sorted escapedNames: # trains, orders, products, shipments, users

    it('finds an exact match', () => {
        const idx = binarySearchByName(tables, 'orders');
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(tables[idx].name).toBe('orders');
    });

    it('finds match case-insensitively', () => {
        expect(binarySearchByName(tables, 'ORDERS')).toBe(binarySearchByName(tables, 'orders'));
        expect(binarySearchByName(tables, 'Users')).toBe(binarySearchByName(tables, 'users'));
    });

    it('finds a quoted identifier by its unquoted normalized form', () => {
        const idx = binarySearchByName(tables, '"# Trains"');
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(tables[idx].name).toBe('"# Trains"');
    });

    it('finds a quoted identifier when searching without quotes', () => {
        // searching "# trains" (no quotes) should still match `"# Trains"` entry
        const idx = binarySearchByName(tables, '# Trains');
        expect(idx).toBeGreaterThanOrEqual(0);
    });

    it('returns -1 for missing entries', () => {
        expect(binarySearchByName(tables, 'invoices')).toBe(-1);
        expect(binarySearchByName(tables, '')).toBe(-1);
    });

    it('returns -1 on empty array', () => {
        expect(binarySearchByName([], 'anything')).toBe(-1);
    });

    it('works on columns', () => {
        const cols = [col('amount'), col('"# Trains"'), col('user_id')]
            .sort((a, b) => a.escapedName.localeCompare(b.escapedName));
        expect(binarySearchByName(cols, 'amount')).toBeGreaterThanOrEqual(0);
        expect(binarySearchByName(cols, '"# Trains"')).toBeGreaterThanOrEqual(0);
        expect(binarySearchByName(cols, 'missing')).toBe(-1);
    });
});
