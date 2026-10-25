import {describe, expect, it} from 'vitest';
import {RelationState} from "@/model/relation-state";
import {cleanAndSplitSQL, removeSemicolon} from "@/platform/sql-utils";
import {addPageScope, expandPageRefs, isPageBlock} from "@/state/relations/sql/page-refs";

function relation(id: string, title: string, sql: string): RelationState {
    return {id, viewState: {displayName: title}, query: {baseQuery: sql, activeBaseQuery: sql}} as unknown as RelationState;
}

// Stands in for the view's macro query, e.g. a dropdown's rows filtered to its pick, after its setup statements.
async function filtered(r: RelationState) {
    const statements = cleanAndSplitSQL(r.query.baseQuery);
    return [...statements.slice(0, -1), `SELECT * FROM (${removeSemicolon(statements.at(-1)!)}) WHERE picked`].join('\n');
}

describe('expandPageRefs', () => {
    const region = relation('block-region', 'Region', "SET threads = 1; SELECT 'North' AS region");
    const sales = relation('block-sales', 'Sales', 'SELECT * FROM refs.region()');
    const chart = relation('block-chart', 'Chart', 'SELECT count(*) FROM refs.sales(), refs.project_relation()');
    const loop = relation('block-loop', 'Loop', 'SELECT * FROM refs.loop()');
    addPageScope({relations: () => Object.fromEntries([region, sales, chart, loop].map(r => [r.id, r])), rename: () => undefined});

    it('expands the refs to blocks of the page recursively, setup statements first', async () => {
        expect(await expandPageRefs(chart.id, chart.query.baseQuery, filtered)).toBe([
            'SET threads = 1;',
            "SELECT count(*) FROM (SELECT * FROM (SELECT * FROM (SELECT * FROM (SELECT 'North' AS region) WHERE picked)) WHERE picked), refs.project_relation()",
        ].join('\n'));
    });

    it('leaves a block reading itself and relations outside any page alone', async () => {
        expect(await expandPageRefs(loop.id, loop.query.baseQuery, filtered)).toBe(loop.query.baseQuery);
        expect(await expandPageRefs('relation-x', 'FROM refs.region()', filtered)).toBe('FROM refs.region()');
        expect(isPageBlock('relation-x')).toBe(false);
        expect(isPageBlock(region.id)).toBe(true);
    });
});
