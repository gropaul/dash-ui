import {describe, expect, it} from 'vitest';
import {buildRelation, headerOf, RelationConfig, withRuntime} from "@/state/workspace/relation-config";
import {joinHeader, splitHeader} from "@/state/workspace/header-lines";

const sql = 'SELECT 1 AS month, 2 AS revenue, 3 AS cost';
const chart: RelationConfig = {id: 'Sales.md#revenue', name: 'monthly_revenue', sql, header: {view: 'line', x: 'month', y: 'revenue'}};

describe('query files', () => {
    it('split into header and SQL and join back', () => {
        const text = '-- view: bar\n-- x: month\nSELECT 1';
        expect(splitHeader(text)).toEqual({header: {view: 'bar', x: 'month'}, sql: 'SELECT 1'});
        expect(joinHeader({view: 'bar', x: 'month'}, 'SELECT 1')).toBe(text);
    });

    it('are a table without a view', () => {
        expect(buildRelation({id: 'orders.sql', name: 'orders', sql, header: {}}).viewState.selectedView).toBe('table');
    });
});

describe('settings', () => {
    it('are left out while the readable keys say it all', () => {
        expect(headerOf(buildRelation(chart), chart)).toEqual(chart.header);
    });

    it('hold the setup of every view, as far as it differs from the defaults', () => {
        const relation = buildRelation(chart);
        relation.query.viewParameters.chart!.plot.cartesian.yAxes![0].decoration.line.stroke.color = 'red';
        relation.query.viewParameters.table.sorting = {revenue: 'DESC'};
        relation.viewState.tableState.columnsHidden = ['cost'];
        const header = headerOf(relation, chart);
        const settings = JSON.parse(header.settings);
        expect(Object.keys(settings).sort()).toEqual(['chart', 'table', 'tableState']);
        expect(settings.table).toEqual({sorting: {revenue: 'DESC'}});

        const rebuilt = buildRelation({...chart, header});
        expect(rebuilt.query.viewParameters.chart!.plot.cartesian.yAxes![0].decoration.line.stroke.color).toBe('red');
        expect(rebuilt.query.viewParameters.table.sorting).toEqual({revenue: 'DESC'});
        expect(rebuilt.viewState.tableState.columnsHidden).toEqual(['cost']);
        expect(headerOf(rebuilt, {...chart, header})).toEqual(header);
    });

    it('read back as a whole chart: what they leave out comes from the defaults', () => {
        const relation = buildRelation(chart);
        relation.query.viewParameters.chart!.plot.cartesian.xLabel = 'Month';
        const rebuilt = buildRelation({...chart, header: headerOf(relation, chart)});
        expect(rebuilt.query.viewParameters.chart).toEqual(relation.query.viewParameters.chart);
    });

    it('leave out the paging and display state the data made', () => {
        const relation = buildRelation(chart);
        relation.query.viewParameters.table.offset = 100;
        relation.viewState.schema = [{name: 'month', type: 'Integer'}, {name: 'revenue', type: 'Integer'}] as never;
        relation.viewState.tableState = {
            columnsOrder: ['month', 'revenue'], columnsHidden: [], showIndexColumn: true,
            columnStates: {month: {width: 192, wrapContent: false}, revenue: {width: 192, wrapContent: false}},
        };
        expect(headerOf(relation, chart)).toEqual(chart.header);
    });

    it('title a chart and label a dropdown by the name', () => {
        expect(buildRelation(chart).query.viewParameters.chart!.plot.title).toBe('Monthly revenue');
        expect(buildRelation({...chart, name: 'region', header: {view: 'select'}}).query.viewParameters.select!.label).toBe('Region');
    });
});

describe('blocks taking a query in', () => {
    const query = buildRelation({id: 'orders.sql', name: 'orders', sql, header: {view: 'line', x: 'month', y: 'revenue'}});
    const block: RelationConfig = {id: 'P.md#orders', name: 'orders', sql: '', header: {input: 'orders.sql'}};

    it('take the query\'s SQL and view, and their own keys override it', () => {
        const same = buildRelation(block, query);
        expect(same.query.baseQuery).toBe(sql);
        expect(same.query.viewParameters.chart!.plot.type).toBe('line');
        const asBars = buildRelation({...block, header: {...block.header, view: 'bar'}}, query);
        expect(asBars.query.viewParameters.chart!.plot.type).toBe('bar');
        expect(asBars.query.viewParameters.chart!.plot.cartesian.xAxis?.columnId).toBe('month');
        expect(buildRelation({...block, header: {...block.header, view: 'table'}}, query).viewState.selectedView).toBe('table');
    });

    it('write no keys while they show the query as it is', () => {
        expect(headerOf(buildRelation(block, query), block, query)).toEqual(block.header);
    });
});

describe('runtime state', () => {
    it('survives a change of the file, and an unchanged build keeps the stored relation', () => {
        const stored = {...buildRelation(chart), queryState: {chart: {}}, executionState: {state: 'success' as const}};
        expect(withRuntime(buildRelation(chart), stored, chart)).toBe(stored);

        const changed = {...chart, header: {...chart.header, view: 'bar'}};
        const merged = withRuntime(buildRelation(changed), stored, changed);
        expect(merged.query.viewParameters.chart!.plot.type).toBe('bar');
        expect(merged.queryState).toBe(stored.queryState);
        expect(merged.executionState).toBe(stored.executionState);
    });
});
