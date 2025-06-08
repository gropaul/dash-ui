import {Layout} from "@/model/relation-view-state";
import {RelationData} from "@/model/relation";
import {DEFAULT_COLORS} from "@/platform/global-data";

export type PlotType = 'bar' | 'area' | 'line' | 'scatter' | 'pie' | 'radar';
export const AVAILABLE_PLOT_TYPES: PlotType[] = ["bar", "scatter", "line", "area", "pie", "radar"]

export interface AxisConfig {
    label: string;
    columnId: string;
    decoration: AxisDecoration;
}

/**
 * Main interface that groups all plot-type-specific decoration settings
 */
export interface AxisDecoration {
    /**
     * Base color for the series (used as a fallback or main color).
     */
    color: string; //todo: this must be the bar/stroke color

    /**
     * Decoration settings specific to Line plots
     */
    line: LineAxisDecoration;

    /**
     * Decoration settings specific to Area plots, takes stroke and dots from line
     */
    area: AreaAxisDecoration;

    /**
     * Decoration settings specific to Bar plots
     */
    bar: BarAxisDecoration;

    /**
     * Decoration settings specific to Scatter plots
     */
    scatter: ScatterAxisDecoration;

    /**
     * Decoration settings specific to Pie plots
     */
    pie: PieAxisDecoration;

    /**
     * Decoration settings specific to Radar plots
     */
    radar: RadarAxisDecoration;

}

/* -------------------------------------------------------------------------- */
/* LINE */
/* -------------------------------------------------------------------------- */


export type LineStyle = 'solid' | 'dashed' | 'dotted';

export interface StrokeDecoration {
    width?: number;
    color: string;
    lineStyle?: LineStyle;
}

export const DEFAULT_STROKE_DECORATION: StrokeDecoration = {
    width: 2,
    color: '#000000',
    lineStyle: 'solid',
}

export type DotsShape = 'circle' | 'square' | 'triangle' | 'diamond';

export interface DotsDecoration {
    visible: boolean;
    fill: string;
    radius?: number;
    borderWidth?: number;
    shape: DotsShape;
}

export const DEFAULT_DOTS_DECORATION: DotsDecoration = {
    visible: true,
    fill: 'white',
    radius: 6,
    borderWidth: 0,
    shape: 'circle',
}

export interface LineAxisDecoration {
    stroke: StrokeDecoration,
    smooth: boolean,
}

/* -------------------------------------------------------------------------- */
/* BAR */
/* -------------------------------------------------------------------------- */
/*
  REMOVED:
    - barSpacing (chart-level concept in Recharts via barGap/barCategoryGap on <BarChart>)
    - barWidth as a fraction. Recharts <Bar> can use `barSize` for a numeric width in px,
      so we keep barWidth as just a number.
*/

export interface BarAxisDecoration {
    /**
     * Width of each bar in pixels.
     * In Recharts, this can be passed to <Bar> as `barSize`.
     */
    barWidth?: number;
    /**
     * Corner radius for rounded bars
     * (used on <Bar> as `radius`).
     */
    cornerRadius: number;
    /**
     * Fill opacity for the bars (0 to 1)
     */
    fillOpacity: number;
    /**
     * Optional "border" for the bars, which translates to stroke/strokeWidth on <Bar>.
     */
    border: {
        width: number;
        color: string;
    };
}

/* -------------------------------------------------------------------------- */
/* SCATTER */
/* -------------------------------------------------------------------------- */
/*
  REMOVED:
    - size (no direct <Scatter> prop). If needed, you'd implement a custom shape.
*/

export interface ScatterAxisDecoration {
    dots: DotsDecoration,
}

/* -------------------------------------------------------------------------- */
/* PIE */
/* -------------------------------------------------------------------------- */
/*
  REMOVED:
    - label.offset (no direct prop for "offset" in Recharts Pie labels).
*/

export interface PieAxisDecoration {
    /**
     * If > 0, this makes the pie chart a donut (inner radius in px or percentage)
     */
    innerRadius: number | string;
    /**
     * Gap between adjacent slices (maps to padAngle on <Pie>)
     */
    padAngle: number;
    /**
     * Rounds the outer corners of slices (cornerRadius on <Pie>)
     */
    cornerRadius: number;
    /**
     * Show or hide labels on slices
     */
    showLabels: boolean;
    /**
     * Label style
     */
    label: {
        color: string;
        fontSize: number;
        fontFamily: string;
    };
}

/* -------------------------------------------------------------------------- */
/* RADAR */
/* -------------------------------------------------------------------------- */

export interface RadarAxisDecoration {
    /**
     * The stroke width of each radar “spoke” (maps to <Radar strokeWidth>)
     */
    strokeWidth: number;
    /**
     * Optionally fill each area (maps to <Radar fill> + fillOpacity)
     */
    fillColor: string;
    fillOpacity: number;
    /**
     * Show or hide points on each radar vertex
     */
    showDots: boolean;
    dotSize: number;
    dotColor: string;
    dotBorderWidth: number;
}

/* -------------------------------------------------------------------------- */
/* AREA */
/* -------------------------------------------------------------------------- */

export interface FillDecoration {
    color: string;
    opacity?: number;
}

export const DEFAULT_FILL_DECORATION: FillDecoration = {
    color: '#000000',
    opacity: 0.2,
}

export interface AreaAxisDecoration {
    fill: FillDecoration;
}

/* -------------------------------------------------------------------------- */
/* Defaults */
/* -------------------------------------------------------------------------- */

export function getInitialAxisDecoration(yIndex: number): AxisDecoration {
    const base_color = DEFAULT_COLORS[yIndex % DEFAULT_COLORS.length]
    return {
        color: base_color,
        scatter: {
            dots: {
                shape: 'circle',
                visible: true,
                fill: base_color,
                radius: 6,
                borderWidth: 0,
            },
        },
        line: {
            stroke: {
                color: base_color,
                width: 2,
                lineStyle: 'solid',
            },
            smooth: false
        },
        // takes stroke and dots from the line decoration
        area: {
            fill: {
                color: base_color,
                opacity: 0.2,
            }
        },

        bar: {
            cornerRadius: 4,
            fillOpacity: 1,
            border: {
                width: 0,
                color: '#000000',
            },
        },


        pie: {
            innerRadius: 0,
            padAngle: 0,
            cornerRadius: 0,
            showLabels: true,
            label: {
                color: '#000000',
                fontSize: 12,
                fontFamily: 'Urbanist, sans-serif',
            },
        },

        radar: {
            strokeWidth: 2,
            fillColor: base_color,
            fillOpacity: 0.2,
            showDots: true,
            dotSize: 6,
            dotColor: base_color,
            dotBorderWidth: 1,
        },

    };
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


export interface AxisRange {
    start?: number
    end?: number
}

export function rangeDefined(range: AxisRange): boolean {
    return range.start !== undefined || range.end !== undefined;
}

export function transformRange(range: AxisRange): [number | string, number | string] {

    // if the range is undefined then 'auto'
    if (range === undefined) {
        return ['auto', 'auto']
    }

    // if both are undefined then 'auto'
    if (range.start === undefined && range.end === undefined) {
        return [0, 'auto']
    }

    // if undefined then 'auto'
    return [range.start ?? 0, range.end ?? 'maxValue']
}

// plot types: bar, line, area, scatter, radar
export type XAxisType = 'time' | 'value' | 'category';

export interface CartesianPlotConfig {
    xAxis?: AxisConfig;
    yAxes?: AxisConfig[]; // can have multiple y axes over the same x axis
    groupBy?: AxisConfig; // optional group by column when there's only one Y-Axis series

    xLabel?: string;
    yLabel?: string;

    xLabelRotation?: number;
    yLabelRotation?: number;

    xAxisType?: XAxisType; // type of the x-axis, if undefined it will be determined automatically

    xRange: AxisRange;
    yRange: AxisRange;

    decoration: CartesianPlotDecoration;
}

interface CartesianPlotDecoration {
    bar: BarPlotDecoration;
}

interface BarPlotDecoration {
    stacked: boolean;
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
                cartesian: {
                    xRange: {},
                    yRange: {},
                    decoration: {
                        bar: {
                            stacked: false
                        }
                    },
                    groupBy: undefined
                },
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
                cartesian: {
                    xRange: {},
                    yRange: {},
                    decoration: {
                        bar: {
                            stacked: false
                        }
                    },
                    groupBy: undefined
                },
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

    // if groupBy is defined, then xAxis must be defined. If both are defined, they must be different
    if (plotConfig.cartesian.groupBy && plotConfig.cartesian.xAxis) {
        if (plotConfig.cartesian.groupBy.columnId === plotConfig.cartesian.xAxis.columnId) {
            return {
                type: 'config-not-complete',
                message: 'Group by column and x-axis column must be different.'
            }
        }
    } else if (plotConfig.cartesian.groupBy) {
        // if groupBy is defined, then xAxis must be defined, same for yAxes
        if (!plotConfig.cartesian.xAxis) {
            return {
                type: 'config-not-complete',
                message: 'Please define the x-axis column.'
            }
        } else if (!plotConfig.cartesian.yAxes) {
            return {
                type: 'config-not-complete',
                message: 'Please define at least one Y-axis.'
            }
        } else if ((plotConfig.cartesian.yAxes?.length ?? 0) > 1) {
            return {
                type: 'config-not-complete',
                message: 'Group by column is only supported with one Y-axis.'
            }
        } else if (plotConfig.cartesian?.yAxes[0].columnId === plotConfig.cartesian.groupBy.columnId) {
            return {
                type: 'config-not-complete',
                message: 'Group by column and y-axis column must be different.'
            }
        }
    }

    // check if needed columns are there
    const neededColumns = getNeededColumnsForConfig(chartConfig);
    const missingColumns = neededColumns.filter(columnId => !relationData.columns.find(column => column.id === columnId));

    if (missingColumns.length > 0) {

        console.warn(`Missing columns: ${missingColumns.join(', ')}, available columns: ${relationData.columns.map(column => column.id).join(', ')}`)
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

            if (plotConfig.cartesian.groupBy) {
                if (plotConfig.cartesian.xAxis) {

                    return [plotConfig.cartesian.xAxis.columnId];
                } else {
                    return [];
                }
            }

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
