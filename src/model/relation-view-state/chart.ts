import {RelationData} from "@/model/relation";
import {CHART_QUERY_LIMIT, DEFAULT_COLORS} from "@/platform/global-data";
import {columnExists, isNumeric, isTextType} from "@/model/relation-view-state/column-utils";

export type PlotType = 'bar' | 'area' | 'line' | 'scatter' | 'pie' | 'radar';
export const AVAILABLE_PLOT_TYPES: PlotType[] = ["bar", "scatter", "line", "area", "pie", "radar"]

export interface AxisConfig {
    columnId: string;
    decoration: AxisDecoration;
}

/**
 * Main interface that groups all plot-type-specific decoration settings.
 *
 * The single color of a series is `line.stroke.color`: it is the line/area stroke, the bar fill and
 * the swatch shown in the column picker. The other color fields here are separate on purpose
 * (a dot fill or an area fill may differ from the stroke).
 */
export interface AxisDecoration {
    /**
     * Decoration settings specific to Line plots. `stroke.color` is the series color for every
     * plot type, not just lines.
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
        fontSize: number;
        fontFamily: string;
    };
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
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
            },
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

export interface ChartViewState {
    chart: ChartConfig;
}


export function getTitleForType(type: RelationDisplayError) {
    switch (type) {
        case 'config-not-complete':
            return 'Configuration not complete';
        case 'missing-columns':
            return 'Missing Columns';
        case "no-data":
            return 'No data';
        case 'too-much-data':
            return 'Too much data';
    }

    throw new Error(`Unsupported error type: ${type}`);
}


export type RelationDisplayError = 'config-not-complete' | 'missing-columns' | 'too-much-data' | 'no-data'

export interface PlotDisplayError {
    type: RelationDisplayError;
    message: string;
}

export const NO_DATA_ERROR: PlotDisplayError= {
    type: "no-data",
    message: "The query returned zero rows, so there is nothing to display. :("
}

export function CanDisplayPlot(chartConfig: ChartConfig, relationData: RelationData): PlotDisplayError | undefined {
    const plotConfig = chartConfig.plot;

    // if there is as much data as CHART_QUERY_LIMIT, then warn that not all data is shown
    if (relationData.rows.length >= CHART_QUERY_LIMIT) {
        return {
            type: 'too-much-data',
            message: `The query returned (more then) ${relationData.rows.length} rows, which is the maximum allowed. `
        }
    }

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
    
    // check if we have any data
    if (relationData.rows.length === 0) {
        return NO_DATA_ERROR;
    }

    // check if needed columns are there
    const neededColumns = getNeededColumnsForConfig(chartConfig);
    const missingColumns = neededColumns.filter(columnId => !relationData.columns.find(column => column.id === columnId));
    
    if (missingColumns.length > 0) {
        return {
            type: 'missing-columns',
            message: `Missing data columns: ${missingColumns.join(', ')}`
        }
    }

    // otherwise return no error
    return undefined;
}

/**
 * Create an AxisConfig for a column
 */
function createAxisConfig(column: {id: string}, yIndex: number = 0): AxisConfig {
    return {
        columnId: column.id,
        decoration: getInitialAxisDecoration(yIndex),
    };
}

/**
 * Remove columns from config that are no longer present in the schema
 */
export function cleanupInvalidColumns(
    plotConfig: PlotConfig,
    columns: RelationData['columns']
): PlotConfig {
    const cleaned = {...plotConfig};

    // Clean cartesian config
    if (cleaned.cartesian) {
        cleaned.cartesian = {...cleaned.cartesian};

        if (cleaned.cartesian.xAxis && !columnExists(cleaned.cartesian.xAxis.columnId, columns)) {
            cleaned.cartesian.xAxis = undefined;
        }

        if (cleaned.cartesian.yAxes) {
            cleaned.cartesian.yAxes = cleaned.cartesian.yAxes.filter(
                axis => columnExists(axis.columnId, columns)
            );
            if (cleaned.cartesian.yAxes.length === 0) {
                cleaned.cartesian.yAxes = undefined;
            }
        }

        if (cleaned.cartesian.groupBy && !columnExists(cleaned.cartesian.groupBy.columnId, columns)) {
            cleaned.cartesian.groupBy = undefined;
        }
    }

    // Clean pie config
    if (cleaned.pie?.axis) {
        cleaned.pie = {...cleaned.pie, axis: {...cleaned.pie.axis}};

        if (cleaned.pie.axis.label && !columnExists(cleaned.pie.axis.label.columnId, columns)) {
            cleaned.pie.axis.label = undefined;
        }

        if (cleaned.pie.axis.radius && !columnExists(cleaned.pie.axis.radius.columnId, columns)) {
            cleaned.pie.axis.radius = undefined;
        }
    }

    return cleaned;
}

/**
 * Try to infer a chart config from available data columns.
 * First removes columns that are no longer in the schema, then infers missing axes.
 *
 * For X-axis selection (left to right):
 * - line, area, scatter: prefer numeric column, fallback to text
 * - bar, radar: prefer text column, fallback to numeric
 *
 * For Y-axis: always use first numeric column
 *
 * Returns undefined if inference is not possible (e.g., no numeric columns)
 */
export function tryInferChartConfig(
    chartConfig: ChartConfig,
    relationData: RelationData
): ChartConfig | undefined {
    const columns = relationData.columns;

    if (columns.length === 0) {
        return undefined;
    }

    // First clean up invalid columns from the config
    const cleanedPlotConfig = cleanupInvalidColumns(chartConfig.plot, columns);

    switch (cleanedPlotConfig.type) {
        case 'line':
        case 'area':
        case 'scatter':
        case 'bar':
        case 'radar': {
            // Check if config already has valid Y-axes defined
            if ((cleanedPlotConfig.cartesian.yAxes?.length ?? 0) > 0) {
                // Config is complete, but return cleaned version if it changed
                if (cleanedPlotConfig !== chartConfig.plot) {
                    return {plot: cleanedPlotConfig};
                }
                return undefined;
            }

            // If only one column, use it as both X and Y axis
            if (columns.length === 1) {
                const onlyColumn = columns[0];
                return {
                    plot: {
                        ...cleanedPlotConfig,
                        cartesian: {
                            ...cleanedPlotConfig.cartesian,
                            xAxis: createAxisConfig(onlyColumn),
                            yAxes: [createAxisConfig(onlyColumn, 0)],
                        },
                    },
                };
            }

            // Multiple columns: use 1st as X-axis, next columns as Y-axes (up to 3)
            const xColumn = columns[0];
            const yColumns = columns.slice(1, 4); // Take columns 2, 3, 4 (indices 1, 2, 3)

            return {
                plot: {
                    ...cleanedPlotConfig,
                    cartesian: {
                        ...cleanedPlotConfig.cartesian,
                        xAxis: createAxisConfig(xColumn),
                        yAxes: yColumns.map((col, index) => createAxisConfig(col, index)),
                    },
                },
            };
        }

        case 'pie': {
            // Check if config already has both label and radius
            if (cleanedPlotConfig.pie.axis.label && cleanedPlotConfig.pie.axis.radius) {
                // Config is complete, but return cleaned version if it changed
                if (cleanedPlotConfig !== chartConfig.plot) {
                    return {plot: cleanedPlotConfig};
                }
                return undefined;
            }

            // Find first numeric column for radius (left to right)
            const radiusColumn = columns.find(isNumeric);
            if (!radiusColumn) {
                return undefined; // Can't infer without numeric column
            }

            // Find first text column for label, fallback to any non-radius column
            const labelColumn = columns.find(isTextType)
                ?? columns.find(col => col.id !== radiusColumn.id);

            if (!labelColumn) {
                return undefined; // Can't infer label column
            }

            return {
                plot: {
                    ...cleanedPlotConfig,
                    pie: {
                        axis: {
                            label: cleanedPlotConfig.pie.axis.label ?? createAxisConfig(labelColumn),
                            radius: cleanedPlotConfig.pie.axis.radius ?? createAxisConfig(radiusColumn, 0),
                        },
                    },
                },
            };
        }

        default:
            return undefined;
    }
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
