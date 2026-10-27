import {describe, expect, it} from 'vitest';
import {callsRef, qualifyRefCalls, renameRefCalls, replaceRefCalls} from "@/platform/sql-refs";

const upper = (name: string) => name.toUpperCase();

describe('replaceRefCalls', () => {
    it('replaces refs and dash.refs calls', () => {
        expect(replaceRefCalls('FROM refs.a() JOIN dash.refs.b ( ) ON 1', upper)).toBe('FROM A JOIN B ON 1');
    });

    it('leaves strings, quoted identifiers and comments alone', () => {
        const sql = `SELECT 'refs.a()', "refs.a()" -- refs.a()\n/* refs.a() */ FROM refs.a()`;
        expect(replaceRefCalls(sql, upper)).toBe(`SELECT 'refs.a()', "refs.a()" -- refs.a()\n/* refs.a() */ FROM A`);
    });

    it('leaves calls with arguments, other schemas and unknown names alone', () => {
        const sql = 'FROM refs.a(1), x.refs.a(), refs.b()';
        expect(replaceRefCalls(sql, name => name === 'a' ? 'A' : undefined)).toBe(sql);
    });
});

describe('renameRefCalls', () => {
    it('renames whole names, keeping the prefix and the arguments', () => {
        const sql = 'FROM refs.sales(), dash.refs.SALES(1), refs.sales_2(), x.refs.sales()';
        expect(renameRefCalls(sql, 'sales', 'revenue')).toBe('FROM refs.revenue(), dash.refs.revenue(1), refs.sales_2(), x.refs.sales()');
    });

    it('leaves strings and comments alone', () => {
        const sql = "SELECT 'refs.sales()' -- refs.sales()\nFROM refs.sales()";
        expect(renameRefCalls(sql, 'sales', 'revenue')).toBe("SELECT 'refs.sales()' -- refs.sales()\nFROM refs.revenue()");
        expect(callsRef(sql, 'sales')).toBe(true);
        expect(callsRef("SELECT 'refs.sales()'", 'sales')).toBe(false);
    });
});

describe('qualifyRefCalls', () => {
    it('spells out short calls, keeps full ones, strings and comments', () => {
        expect(qualifyRefCalls("SELECT * FROM refs.orders(), dash.refs.items() -- refs.x()\nWHERE s = 'refs.y()'"))
            .toBe("SELECT * FROM dash.refs.orders(), dash.refs.items() -- refs.x()\nWHERE s = 'refs.y()'");
        expect(qualifyRefCalls('FROM refs.sales(2024)')).toBe('FROM dash.refs.sales(2024)');
    });
});
