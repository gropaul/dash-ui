import {Layout} from "@/model/relation-view-state";
import {RelationData} from "@/model/relation";

export type PlotType = 'bar'

export interface AxisConfig {
    label: string;
    columnId: string;
    color: string;
}

export interface PlotConfig {
    title?: string;
    xAxis?: AxisConfig;
    yAxes?: AxisConfig[]; // can have multiple y axes over the same x axis
    type?: PlotType;
}

export interface ChartConfig {
    plot: PlotConfig;
}

export interface ConfigViewState {
    showConfig: boolean;
    configPlotRatio: number;
    layout: Layout,
}

export interface ChartViewState {
    chart: ChartConfig;
    configView: ConfigViewState;
}

export function getInitialChartViewStateEmpty(): ChartViewState {
    return {
        chart: {
            plot: {}
        },
        configView: {
            showConfig: true,
            configPlotRatio: 0.7,
            layout: 'column',
        }
    }
}

export function getInitialChartViewState(data: RelationData): ChartViewState {
    return {
        chart: {
            plot: {

            }
        },
        configView: {
            showConfig: true,
            configPlotRatio: 0.7,
            layout: 'column',
        }
    }
}