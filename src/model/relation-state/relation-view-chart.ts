import {RelationState} from "@/model/relation-state";
import {CHART_QUERY_LIMIT} from "@/platform/global-data";
import { Column } from "../data-source-connection";
import {IRelationView} from "@/model/relation-state/relation-view-abstract";

export interface ChartQueryParameters {
    xAxis?: string;   // the name of the column to use as x-axis
    yAxes?: string[]; // the names of the columns to use as y-axes
    groupBy?: string; // the names of the columns to use as group by
}

export class RelationViewChart extends IRelationView<ChartQueryParameters> {

    getInitialQueryParametersInternal(): ChartQueryParameters {
        return {}
    }

    getQueryParametersInternal(relation: RelationState): ChartQueryParameters | undefined {
        return relation.query.viewParameters.chart
    }

    fixQueryParametersParameters(parameters: ChartQueryParameters, schema: Column[]): ChartQueryParameters {
        return parameters;
    }

    buildViewQuery(parameters: ChartQueryParameters, fromQuery: string, fromAlias: string) {
        return buildViewChartQuery(parameters, fromQuery, fromAlias);
    }
}


export function buildViewChartQuery(chartQueryParams: ChartQueryParameters, fromQuery: string, fromAlias: string): string {

    if (chartQueryParams.groupBy && chartQueryParams.xAxis && chartQueryParams.yAxes?.length === 1) {
        // build group by query
        const groupBy = chartQueryParams.groupBy;
        const xAxis = chartQueryParams.xAxis;
        const yAxis = chartQueryParams.yAxes[0];

        return `
            WITH data AS (SELECT ${xAxis}, ${groupBy}, ${yAxis}
                          FROM ${fromQuery}),
                 dash_row_number_ids AS (SELECT range as dash_row_number_id FROM range((SELECT COUNT(*) FROM data))),
                 data_with_ids AS (SELECT d.*, dash_row_number_ids.dash_row_number_id
                                   FROM data d POSITIONAL JOIN dash_row_number_ids),
                 data_with_ids_pivot AS (PIVOT data_with_ids
                ON
                                         ${groupBy}
                                         USING
                                         FIRST
                                         (
                                         ${yAxis}
                                         )
                                         GROUP BY ${xAxis}
                                         ORDER BY ${xAxis})
            SELECT COLUMNS(c -> c NOT LIKE '%dash_row_number_id%')
            FROM data_with_ids_pivot
            LIMIT ${CHART_QUERY_LIMIT};
        `;
    } else if (chartQueryParams.xAxis && chartQueryParams.yAxes && chartQueryParams.yAxes.length > 0) {
        // simple select x and y axes
        const xAxis = chartQueryParams.xAxis;
        const yAxes = chartQueryParams.yAxes.join(', ');

        return `
            SELECT ${xAxis}, ${yAxes}
            FROM ${fromQuery}
            LIMIT ${CHART_QUERY_LIMIT};
        `;
    } else {
        return `SELECT *
                FROM ${fromQuery}
                LIMIT ${100};` // todo: We should just return an empty result set
    }

}