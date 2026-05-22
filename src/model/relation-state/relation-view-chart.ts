import {RelationState} from "@/model/relation-state";
import {CHART_QUERY_LIMIT} from "@/platform/global-data";
import {Column} from "../data-source-connection";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";
import {cleanupInvalidColumns, PlotConfig} from "@/model/relation-view-state/chart";

export type ChartInteractionMode = 'none' | 'click' | 'x-range' | 'y-range' | 'box';

export interface ChartQueryParameters {
    plot: PlotConfig;
    interactionMode?: ChartInteractionMode;
}

export interface ChartQueryState {
    // click mode: selected X values (IN clause, multi-select)
    selectedXValues?: (string | number)[];
    // x-range / box: numeric BETWEEN or categorical IN
    xRangeStart?: number;
    xRangeEnd?: number;
    xCategories?: (string | number)[];
    // y-range / box: numeric BETWEEN
    yRangeStart?: number;
    yRangeEnd?: number;
}

export function getInitialChartQueryParameters(): ChartQueryParameters {
    return {
        plot: {
            type: 'bar',
            cartesian: {
                xRange: {},
                yRange: {},
                decoration: {bar: {stacked: false}},
            },
            pie: {axis: {}},
        },
        interactionMode: 'click'
    };
}

export class RelationViewChart extends IRelationView<ChartQueryParameters, ChartQueryState> {

    getInitialQueryParametersInternal(): ChartQueryParameters {
        return getInitialChartQueryParameters();
    }

    getQueryParametersInternal(relation: RelationState): ChartQueryParameters | undefined {
        if (relation.query.viewParameters.chart == undefined) { // backwards compatibility
            relation.query.viewParameters.chart = this.getInitialQueryParametersInternal();
        } else if (relation.query.viewParameters.chart.plot === undefined){
            relation.query.viewParameters.chart.plot = this.getInitialQueryParametersInternal().plot;
        }
        return relation.query.viewParameters.chart;
    }

    fixQueryParametersParameters(parameters: ChartQueryParameters, schema: Column[]): ChartQueryParameters {
        return {
            ...parameters,
            plot: cleanupInvalidColumns(parameters.plot, schema),
        };
    }

    buildViewQuery(parameters: ChartQueryParameters, fromQuery: string, fromAlias: string) {
        return buildViewChartQuery(parameters, fromQuery, fromAlias);
    }

    getInitialQueryStateInternal(): ChartQueryState {
        return {};
    }

    getQueryStateInternal(relation: RelationState): ChartQueryState | undefined {
        return relation.queryState?.chart;
    }

    buildMacroQueryInternal(
        parameters: ChartQueryParameters,
        state: ChartQueryState,
        fromQuery: string,
        _fromAlias: string
    ): string {
        const mode = parameters.interactionMode ?? 'none';
        const cartesian = parameters.plot.cartesian;
        const xAxisId = parameters.plot.type === 'pie'
            ? parameters.plot.pie?.axis?.label?.columnId
            : cartesian.xAxis?.columnId;
        const yAxisIds = cartesian.yAxes?.map(a => a.columnId);
        const groupById = cartesian.groupBy?.columnId;
        const conditions: string[] = [];

        if (mode === 'click') {
            if (state.selectedXValues && state.selectedXValues.length > 0 && xAxisId) {
                const list = state.selectedXValues
                    .map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)
                    .join(', ');
                conditions.push(`"${xAxisId}" IN (${list})`);
            }
        }

        if (mode === 'x-range' || mode === 'box') {
            if (state.xCategories && state.xCategories.length > 0 && xAxisId) {
                const list = state.xCategories
                    .map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)
                    .join(', ');
                conditions.push(`"${xAxisId}" IN (${list})`);
            } else if (state.xRangeStart !== undefined && state.xRangeEnd !== undefined && xAxisId) {
                conditions.push(`"${xAxisId}" BETWEEN ${state.xRangeStart} AND ${state.xRangeEnd}`);
            }
        }

        if ((mode === 'y-range' || mode === 'box') && yAxisIds?.[0]) {
            if (state.yRangeStart !== undefined && state.yRangeEnd !== undefined) {
                conditions.push(`"${yAxisIds[0]}" BETWEEN ${state.yRangeStart} AND ${state.yRangeEnd}`);
            }
        }

        if (conditions.length === 0) return `SELECT * FROM ${fromQuery}`;
        return `SELECT * FROM ${fromQuery} WHERE ${conditions.join(' AND ')}`;
    }
}


export function buildViewChartQuery(parameters: ChartQueryParameters, fromQuery: string, fromAlias: string): string {
    if (parameters.plot === undefined) { // backwards compatibility
        parameters.plot = getInitialChartQueryParameters().plot;
    }
    const cartesian = parameters.plot.cartesian;
    const groupById = cartesian.groupBy?.columnId;
    const xAxisId = cartesian.xAxis?.columnId;
    const yAxisIds = cartesian.yAxes?.map(a => a.columnId);

    if (groupById && xAxisId && yAxisIds?.length === 1) {
        return `
            WITH data AS (SELECT ${xAxisId}, ${groupById}, ${yAxisIds[0]}
                          FROM ${fromQuery}),
                 dash_row_number_ids AS (SELECT range as dash_row_number_id FROM range((SELECT COUNT(*) FROM data))),
                 data_with_ids AS (SELECT d.*, dash_row_number_ids.dash_row_number_id
                                   FROM data d POSITIONAL JOIN dash_row_number_ids),
                 data_with_ids_pivot AS (PIVOT data_with_ids
                ON
                                         ${groupById}
                                         USING
                                         FIRST
                                         (
                                         ${yAxisIds[0]}
                                         )
                                         GROUP BY ${xAxisId}
                                         ORDER BY ${xAxisId})
            SELECT COLUMNS(c -> c NOT LIKE '%dash_row_number_id%')
            FROM data_with_ids_pivot
            LIMIT ${CHART_QUERY_LIMIT};
        `;
    } else if (xAxisId && yAxisIds && yAxisIds.length > 0) {
        return `
            SELECT ${xAxisId}, ${yAxisIds.join(', ')}
            FROM ${fromQuery}
            LIMIT ${CHART_QUERY_LIMIT};
        `;
    } else {
        return `SELECT * FROM ${fromQuery} LIMIT ${100};`;
    }
}
