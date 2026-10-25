import {describe, expect, it} from "vitest";
import {buildWorkspaceTree} from "@/state/workspace/workspace-tree";

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
