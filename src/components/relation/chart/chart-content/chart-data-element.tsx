import React from "react";
import {
    Area,
    Bar,
    Cell,
    Line,
    Pie,
    Radar,
    Scatter,
    // Recharts doesn't have a direct "dot" prop for Radar, but we can pass it if we do <Radar dot={{...}}>.
} from "recharts";
import { AxisConfig, PlotType } from "@/model/relation-view-state/chart";
import { DEFAULT_COLORS } from "@/platform/global-data";

/**
 * The entire AxisDecoration interface and sub-interfaces are assumed to be
 * part of `props.axis.decoration.*`.
 */
interface ChartDataElementProps {
    type: PlotType;
    axis: AxisConfig;
    /**
     * For Pie charts, we need the whole data array, as Pie doesn't automatically
     * pick it up from the parent context in all Recharts usage patterns.
     */
    elementData?: any[];
    /**
     * For Pie, which key in the data to use as the "name" or category
     */
    nameKey?: string;
}

export function ChartDataElement(props: ChartDataElementProps) {
    const { type, axis, elementData = [], nameKey } = props;

    switch (type) {
        case "line": {
            // Extract line-specific decoration
            const {
                strokeWidth,
                strokeDasharray,
                dots: {
                    visible: dotVisible,
                    fill: dotFill,
                    radius: dotRadius,
                    borderWidth: dotBorderWidth,
                },
            } = axis.decoration.line;

            const lineStroke = axis.decoration.color;
            const dotProps =
                dotVisible
                    ? {
                        r: dotRadius,
                        fill: dotFill,
                        strokeWidth: dotBorderWidth
            }
                    : false;

            return (
                <Line
                    // set the circle color to doteProps.stroke
                    style={{ stroke: lineStroke }}
                    dataKey={axis.columnId}
                    type="monotone"
                    stroke={lineStroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    dot={dotProps}
                    /* Optionally customize the active dot when hovering */
                    activeDot={{ r: dotRadius + 2 }}
                />
            );
        }

        case "bar": {
            // Extract bar-specific decoration
            const {
                barWidth,
                stacked,
                cornerRadius,
                fillOpacity,
                border,
            } = axis.decoration.bar;

            const barStroke = border?.width
                ? border.color || "#000"
                : "none";
            const barStrokeWidth = border?.width || 0;

            // Recharts:
            // - `barSize` is the approximate width in px.
            // - There's no direct prop for barSpacing on <Bar> itself; that is typically managed at <BarChart> level via `barGap` / `barCategoryGap`.
            // - For stacked bars, you must add the same non-empty string to `stackId` for each series that should be in the stack.
            // - `cornerRadius` is done via the `radius` prop.
            // - fillOpacity can be set on <Bar> directly.

            return (
                <Bar
                    style={{ stroke: barStroke }}

                    dataKey={axis.columnId}
                    fill={axis.decoration.color}
                    fillOpacity={fillOpacity}
                    stroke={barStroke}
                    strokeWidth={barStrokeWidth}
                    /*
                      barSize (number) adjusts the bar width in px.
                      If `barWidth` is a string like '0.8' (meaning 80%), you'd typically set that
                      on the parent chart as `barCategoryGap={...}`. For partial support, you can
                      parse to a number or skip if it's not numeric.
                    */
                    barSize={typeof barWidth === "number" ? barWidth : undefined}
                    /*
                      If you want a stacked bar, you must provide the same stackId to each <Bar> component
                      that shares the "stack".
                    */
                    stackId={stacked ? "stack-1" : undefined}
                    /*
                      Recharts supports a single radius or an array of corner radii, e.g. [topLeft, topRight, bottomRight, bottomLeft].
                      For simplicity, we pass one cornerRadius value:
                    */
                    radius={cornerRadius}
                />
            );
        }

        case "scatter": {
            // Extract scatter-specific decoration
            const {
                shape,
                stroke: { width: scatterStrokeWidth, color: scatterStrokeColor },
                fillOpacity,
            } = axis.decoration.scatter;

            // Recharts supports shape as a built-in string or a custom component.
            // Supported strings: "circle", "cross", "diamond", "square", "star", "triangle", "wye".
            // There's no direct 'size' prop, but you can pass a custom shape or manage via data points.
            // We can pass an inline function or object to `shape` for partial control.

            // For demonstration, let's do a minimal approach:
            return (
                <Scatter
                    style={{ stroke: scatterStrokeColor }}
                    dataKey={axis.columnId}
                    fill={axis.decoration.color}
                    fillOpacity={fillOpacity}
                    stroke={scatterStrokeColor}
                    strokeWidth={scatterStrokeWidth}
                    shape={shape} // e.g. "circle", "square", "triangle", etc.
                />
            );
        }

        case "pie": {
            // Extract pie-specific decoration
            const {
                innerRadius,
                padAngle,
                cornerRadius,
                showLabels,
                label: { color: labelColor, fontSize, fontFamily },
            } = axis.decoration.pie;

            // For "offset" in a pie label, Recharts doesn't have a direct offset prop.
            // You can do a custom label function or pass "labelLine={...}" props.
            // We'll pass a partial style to label, but it won't handle 'offset' by default.

            return (
                <Pie
                    data={elementData}
                    dataKey={axis.columnId}
                    nameKey={nameKey}
                    innerRadius={innerRadius}
                    outerRadius={"70%"}
                    paddingAngle={padAngle}
                    // Recharts uses `padAngle` for slice spacing
                    cornerRadius={cornerRadius}
                    /*
                      `label` can be a boolean, function, or object. We'll do an object if showLabels
                      is true; otherwise false. We can set fill, fontSize, etc.
                      Offsets or advanced styling might require a custom label component.
                    */
                    label={
                        showLabels
                            ? {
                                fill: labelColor,
                                fontSize,
                                fontFamily,
                                // offset is not directly supported; would need a custom label
                            }
                            : false
                    }
                >
                    {elementData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                        />
                    ))}
                </Pie>
            );
        }

        case "radar": {
            // Extract radar-specific decoration
            const {
                strokeWidth,
                fillColor,
                fillOpacity,
                showDots,
                dotSize,
                dotColor,
                dotBorderWidth
            } = axis.decoration.radar;

            // <Radar> can accept `dot` as an object or boolean to show/hide.
            // If showDots is true, we can pass an object with radius, stroke, fill, etc.

            const dotProps = showDots
                ? {
                    r: dotSize,
                    fill: dotColor,
                    strokeWidth: dotBorderWidth
                }
                : false;

            return (
                <Radar
                    style={{ stroke: axis.decoration.color }}

                    dataKey={axis.columnId}
                    stroke={axis.decoration.color}
                    strokeWidth={strokeWidth}
                    fill={fillColor}
                    fillOpacity={fillOpacity}
                    dot={dotProps}
                />
            );
        }

        case "area": {
            // Extract area-specific decoration
            const {
                stroke: { width: areaStrokeWidth, dasharray },
                fillColor,
                fillOpacity,
                showDots,
                dotSize,
                dotColor,
                dotBorderWidth
            } = axis.decoration.area;

            // Recharts <Area> supports dot similarly to <Line>.
            // We'll pass dot={false} if showDots is false.

            const dotProps = showDots
                ? {
                    r: dotSize,
                    fill: dotColor,
                    strokeWidth: dotBorderWidth,
                    fillOpacity: 1
            }
                : false;

            return (
                <Area
                    style={{ stroke: axis.decoration.color }}

                    dataKey={axis.columnId}
                    type="monotone"
                    stroke={axis.decoration.color}
                    strokeWidth={areaStrokeWidth}
                    strokeDasharray={dasharray}
                    fill={fillColor}
                    fillOpacity={fillOpacity}
                    dot={dotProps}
                />
            );
        }

        default:
            throw new Error(`Unknown plot type ${type}`);
    }
}
