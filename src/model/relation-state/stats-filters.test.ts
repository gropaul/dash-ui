import {describe, expect, it} from "vitest";
import {setColumnFilter, withStatsFilters} from "@/model/relation-state/stats-filters";
import {Column} from "@/model/data-source-connection";

const SOURCE = '(SELECT * FROM stops) AS q';
const columns: Column[] = [
    {id: 'station', name: 'station', type: 'String'},
    {id: 'stops', name: 'stops', type: 'Integer'},
    {id: 'first_day', name: 'first_day', type: 'Timestamp'},
];

describe('withStatsFilters', () => {
    it('leaves the query as it is without filters', () => {
        expect(withStatsFilters(SOURCE, 'q', undefined, columns)).toBe(SOURCE);
        expect(withStatsFilters(SOURCE, 'q', {}, columns)).toBe(SOURCE);
    });

    it('narrows the query to picked values and ranges, all of them', () => {
        const sql = withStatsFilters(SOURCE, 'q', {
            station: {type: 'values', values: ['Gouda', "'s-Hertogenbosch"]},
            stops: {type: 'range', min: 3000, max: 5000},
        }, columns);
        expect(sql).toBe(`(SELECT * FROM ${SOURCE} WHERE "station" IN ('Gouda', '''s-Hertogenbosch') AND "stops" BETWEEN 3000 AND 5000) AS q`);
    });

    it('compares a date range on epoch milliseconds, as its histogram counts it', () => {
        expect(withStatsFilters(SOURCE, 'q', {first_day: {type: 'range', min: 1, max: 2}}, columns))
            .toContain('epoch_ms("first_day") BETWEEN 1 AND 2');
    });

    it('matches NULL for a picked null', () => {
        expect(withStatsFilters(SOURCE, 'q', {station: {type: 'values', values: [null, 'Gouda']}}, columns))
            .toContain(`("station" IN ('Gouda') OR "station" IS NULL)`);
    });

    it('drops filters on columns the query no longer has', () => {
        expect(withStatsFilters(SOURCE, 'q', {gone: {type: 'values', values: [1]}}, columns)).toBe(SOURCE);
    });
});

describe('setColumnFilter', () => {
    it('sets and removes one column, keeping the others', () => {
        const one = setColumnFilter(undefined, 'stops', {type: 'range', min: 1, max: 2});
        const two = setColumnFilter(one, 'station', {type: 'values', values: ['Gouda']});
        expect(Object.keys(two)).toEqual(['stops', 'station']);
        expect(setColumnFilter(two, 'stops', undefined)).toEqual({station: {type: 'values', values: ['Gouda']}});
    });
});
