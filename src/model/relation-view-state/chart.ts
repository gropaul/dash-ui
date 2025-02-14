import {Layout} from "@/model/relation-view-state";
import {RelationData} from "@/model/relation";
import {DEFAULT_COLORS} from "@/platform/global-data";

export type PlotType = 'bar' | 'area' | 'line' | 'scatter' | 'pie' | 'radar';
export const AVAILABLE_PLOT_TYPES: PlotType[] = ["bar", "area", "line", "scatter", "pie", "radar"]

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
    color: string;

    /**
     * Decoration settings specific to Line plots
     */
    line: LineAxisDecoration;

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

    /**
     * Decoration settings specific to Area plots
     */
    area: AreaAxisDecoration;
}

/* -------------------------------------------------------------------------- */
/* LINE */
/* -------------------------------------------------------------------------- */

export interface LineAxisDecoration {
    strokeWidth: number;
    strokeDasharray: string;
    dots: {
        visible: boolean;
        fill: string;
        radius: number;
        borderWidth: number;
        borderColor: string;
    };
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
    barWidth: number;
    /**
     * Whether to stack multiple bars that share the same x-axis value
     * (implemented by passing `stackId` on <Bar>).
     */
    stacked: boolean;
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
    /**
     * Built-in shape name used by Recharts.
     * Valid strings (in Recharts) include "circle", "cross", "diamond",
     * "square", "star", "triangle", and "wye".
     */
    shape: 'circle' | 'square' | 'triangle' | 'diamond';
    /**
     * Stroke around each point (maps to <Scatter stroke / strokeWidth>).
     */
    stroke: {
        width: number;
        color: string;
    };
    /**
     * Fill color for the points (maps to <Scatter fill>).
     */
    fillColor: string;
    /**
     * Opacity (0 to 1) for the scatter points.
     */
    fillOpacity: number;
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
     * Color for the border of each area in the radar (maps to <Radar stroke>)
     */
    borderColor: string;
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
    dotBorderColor: string;
}

/* -------------------------------------------------------------------------- */
/* AREA */
/* -------------------------------------------------------------------------- */

export interface AreaAxisDecoration {
    /**
     * Stroke settings for the line around the area
     */
    stroke: {
        width: number;
        dasharray: string;
        color: string;
    };
    /**
     * Fill color of the area
     */
    fillColor: string;
    /**
     * Opacity of the fill (0 to 1)
     */
    fillOpacity: number;
    /**
     * Show or hide dots on the area boundary
     */
    showDots: boolean;
    dotSize: number;
    dotColor: string;
    dotBorderWidth: number;
    dotBorderColor: string;
}

/* -------------------------------------------------------------------------- */
/* Defaults */
/* -------------------------------------------------------------------------- */

export function getInitialAxisDecoration(): AxisDecoration {
    return {
        color: DEFAULT_COLORS[0],

        line: {
            strokeWidth: 2,
            strokeDasharray: 'none',
            dots: {
                visible: true,
                fill: DEFAULT_COLORS[0],
                radius: 3,
                borderWidth: 0,
                borderColor: '#000000',
            },
        },

        bar: {
            barWidth: 20, // default pixel width; adjust as needed
            stacked: false,
            cornerRadius: 0,
            fillOpacity: 1,
            border: {
                width: 0,
                color: '#000000',
            },
        },

        scatter: {
            shape: 'circle',
            stroke: {
                width: 1,
                color: '#333333',
            },
            fillColor: DEFAULT_COLORS[0],
            fillOpacity: 1,
        },

        pie: {
            innerRadius: 0,
            padAngle: 0,
            cornerRadius: 0,
            showLabels: true,
            label: {
                color: '#000000',
                fontSize: 12,
                fontFamily: 'sans-serif',
            },
        },

        radar: {
            strokeWidth: 2,
            borderColor: DEFAULT_COLORS[0],
            fillColor: DEFAULT_COLORS[0],
            fillOpacity: 0.2,
            showDots: true,
            dotSize: 4,
            dotColor: DEFAULT_COLORS[0],
            dotBorderWidth: 1,
            dotBorderColor: '#000000',
        },

        area: {
            stroke: {
                width: 2,
                dasharray: 'none',
                color: DEFAULT_COLORS[0],
            },
            fillColor: DEFAULT_COLORS[0],
            fillOpacity: 0.2,
            showDots: true,
            dotSize: 3,
            dotColor: DEFAULT_COLORS[0],
            dotBorderWidth: 0,
            dotBorderColor: '#000000',
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
export interface CartesianPlotConfig {
    xAxis?: AxisConfig;
    yAxes?: AxisConfig[]; // can have multiple y axes over the same x axis

    xLabel?: string;
    yLabel?: string;

    xRange: AxisRange;
    yRange: AxisRange;
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
                    yRange: {}
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
                    yRange: {}
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