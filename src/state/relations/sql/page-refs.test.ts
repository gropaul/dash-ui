import {describe, expect, it} from 'vitest';
import {RelationState} from "@/model/relation-state";
import {cleanAndSplitSQL, removeSemicolon} from "@/platform/sql-utils";
import {expandPageRefs, missingRefs} from "@/state/relations/sql/page-refs";
import {useSurfaces} from "@/state/workspace/surfaces.state";
import {useWorkspace} from "@/state/workspace/workspace.state";

function relation(id: string, sql: string): RelationState {
    return {id, viewState: {displayName: id.split('#')[1]}, query: {baseQuery: sql, activeBaseQuery: sql}} as unknown as RelationState;
}

// Stands in for the view's macro query, e.g. a dropdown's rows filtered to its pick, after its setup statements.
async function filtered(r: RelationState) {
    const statements = cleanAndSplitSQL(r.query.baseQuery);
    return [...statements.slice(0, -1), `SELECT * FROM (${removeSemicolon(statements.at(-1)!)}) WHERE picked`].join('\n');
}

describe('expandPageRefs', () => {
    const region = relation('P.md#region', "SET threads = 1; SELECT 'North' AS region");
    const sales = relation('P.md#sales', 'SELECT * FROM refs.region()');
    const chart = relation('P.md#chart', 'SELECT count(*) FROM refs.sales(), refs.project_query()');
    const loop = relation('P.md#loop', 'SELECT * FROM refs.loop()');
    const removed = relation('P.md#gone', 'SELECT 1');
    [region, sales, chart, loop, removed].forEach(r => useSurfaces.getState().set(r));
    useWorkspace.setState({files: {'P.md': ['region', 'sales', 'chart', 'loop'].map(n => '```sql ' + n + '\n-- view: table\n```').join('\n')}});

    it('expands the refs to blocks of the page recursively, setup statements first', async () => {
        expect(await expandPageRefs(chart.id, chart.query.baseQuery, filtered)).toBe([
            'SET threads = 1;',
            "SELECT count(*) FROM (SELECT * FROM (SELECT * FROM (SELECT * FROM (SELECT 'North' AS region) WHERE picked)) WHERE picked), refs.project_query()",
        ].join('\n'));
    });

    it('leaves a block reading itself, queries and blocks no longer on the page alone', async () => {
        expect(await expandPageRefs(loop.id, loop.query.baseQuery, filtered)).toBe(loop.query.baseQuery);
        expect(await expandPageRefs('orders.sql', 'FROM refs.region()', filtered)).toBe('FROM refs.region()');
        expect(await expandPageRefs(sales.id, 'FROM refs.gone()', filtered)).toBe('FROM refs.gone()');
    });
});

describe('missingRefs', () => {
    it('names the refs no query file and no block of the page has', () => {
        useWorkspace.setState({files: {'P.md': '```sql region\n-- view: select\n```', 'orders.sql': 'SELECT 1'}});
        useSurfaces.getState().set(relation('P.md#region', 'SELECT 1'));
        expect(missingRefs('P.md#chart', 'FROM refs.region(), refs.orders(), refs.gone()')).toEqual(['gone']);
        expect(missingRefs('totals.sql', 'FROM refs.region()')).toEqual(['region']);
    });
});
