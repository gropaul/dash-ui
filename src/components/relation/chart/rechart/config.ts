
export type PlotType = 'bar'

export interface AxisConfig {
    label: string;
    columnName: string;
    color: string;
}

export interface PlotConfig {
    title: string;
    xAxis: AxisConfig;
    yAxis: AxisConfig;
    type: PlotType;
}

export interface ChartConfig {
    plot: PlotConfig;
}