import {describe, expect, it} from "vitest";
import {ChartConfig, PlotType, tryInferChartConfig} from "@/model/relation-view-state/chart";
import {Column} from "@/model/data-source-connection";
import {ValueType} from "@/model/value-type";

const column = (name: string, type: ValueType): Column => ({id: name, name, type});

function chart(type: PlotType): ChartConfig {
    return {plot: {type, cartesian: {xRange: {}, yRange: {}, decoration: {bar: {stacked: false}}}, pie: {axis: {}}}} as ChartConfig;
}

function inferred(type: PlotType, columns: Column[]) {
    const config = tryInferChartConfig(chart(type), {columns, rows: []});
    return {x: config?.plot.cartesian.xAxis?.columnId, y: config?.plot.cartesian.yAxes?.map(axis => axis.columnId)};
}

describe('tryInferChartConfig', () => {
    const stops = [column('station', 'String'), column('stops', 'Integer'), column('first_day', 'Timestamp')];

    it('draws a bar chart of the numbers by the text column, leaving dates out of the Y-axes', () => {
        expect(inferred('bar', stops)).toEqual({x: 'station', y: ['stops']});
    });

    it('puts a date on the X-axis of a line chart', () => {
        expect(inferred('line', stops)).toEqual({x: 'first_day', y: ['stops']});
    });

    it('takes up to three numeric columns as Y-axes', () => {
        const columns = [column('day', 'Timestamp'), ...['a', 'b', 'c', 'd'].map(name => column(name, 'Float'))];
        expect(inferred('area', columns)).toEqual({x: 'day', y: ['a', 'b', 'c']});
    });

    it('infers nothing without a numeric column for the Y-axis', () => {
        expect(tryInferChartConfig(chart('bar'), {columns: [column('station', 'String'), column('day', 'Timestamp')], rows: []}))
            .toBeUndefined();
    });
});
