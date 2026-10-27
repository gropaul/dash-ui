import {describe, expect, it} from "vitest";
import {buildWorkspaceTree} from "@/state/workspace/workspace-tree";
import {relativePath, resolveRelative} from "@/state/workspace/paths";

describe('buildWorkspaceTree', () => {
    it('nests files in folders, folders first, by name ignoring case', () => {
        const tree = buildWorkspaceTree(
            ['b.md', 'Sales/orders.sql', 'Sales/Q3.md', 'A.canvas', 'notes.txt'],
            ['Sales', 'Empty'],
        );
        const names = (nodes = tree): unknown[] => nodes.map(n => n.children ? [n.name, names(n.children)] : `${n.name}:${n.kind}`);
        expect(names()).toEqual([
            ['Empty', []],
            ['Sales', ['orders:query', 'Q3:page']],
            'A:canvas',
            'b:page',
            'notes.txt:file',
        ]);
    });
});

describe('relative paths', () => {
    it('resolve from a file and back', () => {
        expect(resolveRelative('Sales/Q3.md', '../orders.sql')).toBe('orders.sql');
        expect(resolveRelative('Sales/Q3.md', 'sub/x.sql')).toBe('Sales/sub/x.sql');
        expect(resolveRelative('Sales/Q3.md', '/Other/x.md')).toBe('Other/x.md');
        expect(resolveRelative('Q3.md', '../x.md')).toBeUndefined();
        expect(relativePath('Sales/Q3.md', 'orders.sql')).toBe('../orders.sql');
        expect(relativePath('Sales/Q3.md', 'Sales/sub/x.sql')).toBe('sub/x.sql');
    });
});
