import {Layout} from "@/model/relation-view-state";
import {RelationData} from "@/model/relation";

export type PlotType = 'bar' | 'area' | 'line' | 'scatter' | 'pie' | 'radar';
export const AVAILABLE_PLOT_TYPES: PlotType[] = ["bar", "area", "line", "scatter", "pie", "radar"]

export interface AxisConfig {
    label: string;
    columnId: string;
    color: string;
}

export interface PieAxisConfig {
    label?: AxisConfig;
    radius?: AxisConfig
}

export interface PlotConfig {
    title?: string;
    type: PlotType;
    cartesian: CartesianPlotConfig;
    pie: PiePlotConfig;
}

// plot types: bar, line, area, scatter, radar
export interface CartesianPlotConfig {
    xAxis?: AxisConfig;
    yAxes?: AxisConfig[]; // can have multiple y axes over the same x axis
}

// plot type: pie
export interface PiePlotConfig {
    axis: PieAxisConfig;
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
            plot: {
                type: 'bar',
                cartesian: {},
                pie: {
                    axis: {}
                }
            }
        },
        configView: {
            showConfig: true,
            configPlotRatio: 0.5,
            layout: 'column',
        }
    }
}

export function getInitialChartViewState(data: RelationData): ChartViewState {
    return {
        chart: {
            plot: {
                type: 'bar',
                cartesian: {},
                pie: {
                    axis: {}
                }
            }
        },
        configView: {
            showConfig: true,
            configPlotRatio: 0.5,
            layout: 'column',
        }
    }
}