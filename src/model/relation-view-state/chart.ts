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
    view: ConfigViewState;
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
        view: {
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
        view: {
            showConfig: true,
            configPlotRatio: 0.5,
            layout: 'column',
        }
    }
}

export function getTitleForType(type: PlotDisplayErrorType) {
    switch (type) {
        case 'config-not-complete':
            return 'Configuration not complete';
        case 'missing-data':
            return 'Missing data';
    }

    throw new Error(`Unsupported error type: ${type}`);
}


export type PlotDisplayErrorType = 'config-not-complete' | 'missing-data'

export interface PlotDisplayError {
    type: PlotDisplayErrorType;
    message: string;
}

export function CanDisplayPlot(chartConfig: ChartConfig, relationData: RelationData): PlotDisplayError | undefined {
    const plotConfig = chartConfig.plot;
    switch (plotConfig.type) {
        case 'bar':
        case "radar":
        case "line":
        case "scatter":
        case "area":
            if ((plotConfig.cartesian.yAxes?.length ?? 0) == 0) {
                return {
                    type: 'config-not-complete',
                    message: 'Please define at least one Y-axis.'
                }
            }
            break;
        case "pie":
            if (plotConfig.pie.axis.label === undefined || plotConfig.pie.axis.radius === undefined) {
                return {
                    type: 'config-not-complete',
                    message: 'Please define both the label and radius axis.'
                }
            }
            break;
        default:
            throw new Error(`Unsupported plot type: ${plotConfig.type}`);
    }

    // check if needed columns are there
    const neededColumns = getNeededColumnsForConfig(chartConfig);
    const missingColumns = neededColumns.filter(columnId => !relationData.columns.find(column => column.id === columnId));

    if (missingColumns.length > 0) {
        return {
            type: 'missing-data',
            message: `Missing data columns: ${missingColumns.join(', ')}`
        }
    }

    // otherwise return no error
    return undefined;
}


export function getNeededColumnsForConfig(chartConfig: ChartConfig) {
    const plotConfig = chartConfig.plot;
    switch (plotConfig.type) {
        case 'bar':
        case "radar":
        case "line":
        case "scatter":
        case "area": {
            let columns = plotConfig.cartesian.yAxes?.map(axis => axis.columnId) ?? [];
            if (plotConfig.cartesian.xAxis) {
                columns.push(plotConfig.cartesian.xAxis.columnId);
            }
            return columns;
        }
        case "pie": {
            let columns: string[] = [];
            if (plotConfig.pie.axis.label) {
                columns.push(plotConfig.pie.axis.label.columnId);
            }
            if (plotConfig.pie.axis.radius) {
                columns.push(plotConfig.pie.axis.radius.columnId);
            }
            return columns;
        }
        default:
            throw new Error(`Unsupported plot type: ${plotConfig.type}`);
    }
}