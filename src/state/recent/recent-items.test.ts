import {describe, expect, it} from 'vitest';
import {keepDisplayOrder, RecentItem} from "@/state/recent/recent-items";

const item = (id: string, lastViewedAt: number): RecentItem =>
    ({id, name: id, kind: "query", lastViewedAt});
const ids = (items: RecentItem[]) => items.map((i) => i.id);

describe('keepDisplayOrder', () => {
    it('sorts by recency on first show', () => {
        expect(ids(keepDisplayOrder([], [item('a', 3), item('b', 2), item('c', 1)]))).toEqual(['a', 'b', 'c']);
    });

    it('does not move an already listed item when it is viewed again', () => {
        expect(ids(keepDisplayOrder(['a', 'b', 'c'], [item('c', 9), item('a', 3), item('b', 2)]))).toEqual(['a', 'b', 'c']);
    });

    it('puts a newly viewed item on top and drops the evicted one', () => {
        expect(ids(keepDisplayOrder(['a', 'b', 'c'], [item('d', 9), item('b', 8), item('a', 3)]))).toEqual(['d', 'a', 'b']);
    });

    it('appends a backfilled older item at the bottom', () => {
        expect(ids(keepDisplayOrder(['a', 'b', 'c'], [item('a', 3), item('c', 2), item('x', 1)]))).toEqual(['a', 'c', 'x']);
    });
});
