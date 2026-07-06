import {AxisConfig, ChartConfig, getInitialAxisDecoration, PlotConfig} from "@/model/relation-view-state/chart";
import {RelationData} from "@/model/relation";
import {EChartsOption} from "echarts-for-react/src/types";
import {DEFAULT_COLORS} from "@/platform/global-data";
import {ChartInteractionMode, ChartQueryState} from "@/model/relation-state/relation-view-chart";


export function plotIsCartesian(plot: PlotConfig) {
    return ["bar", "line", "area", "scatter"].includes(plot.type)
}

export function plotUsesGroup(plot: PlotConfig) {
    return plotIsCartesian(plot) && plot.cartesian.groupBy
}

export function toEChartOptions(
    config: ChartConfig,
    data: RelationData,
    textColor: string = '#333',
    interactionMode: ChartInteractionMode = 'click',
    queryState: ChartQueryState = {}
): EChartsOption {

    const {plot} = config;

    const plotHasYAxisName = plotIsCartesian(plot) && !!plot.cartesian.yLabel;
    const plotHasXAxisName = plotIsCartesian(plot) && !!plot.cartesian.xLabel;
    const plotHasTitle = !!plot.title;
    const plotCartesianYAxisCount =  plot.cartesian?.yAxes?.length ?? 0;
    const plotNeedsLegend =
        (plotIsCartesian(plot) && (plotUsesGroup(plot) || plotCartesianYAxisCount > 1))
        || (!plotIsCartesian(plot) && plot.type === 'pie');



    const titleHeight = plotHasTitle ? 32 : 0;
    const yNameHeight = plotHasYAxisName ? 8 : 0;
    const legendHeight = plotNeedsLegend ? 24 : 0;
    const gridTop = titleHeight + yNameHeight + legendHeight + 16;

    const baseConfig = {
        toolbox: {show: false},
        title: {
            text: plot.title ? plot.title : null,
            left: '16px',
            top: '8px',
            textStyle: {color: textColor, fontSize: 16},
        },
        tooltip: {trigger: 'axis'},
        legend: {
            show: plotNeedsLegend,
            type: 'scroll',
            selectedMode: true,
            orient: 'horizontal',
            top: plot.title ? '32px' : '8px',
            left: '16px',
            textStyle: {color: textColor},
        },
        grid: {
            containLabel: true,
            left: '16px',
            right: '16px',
            bottom: '16px',
            top: `${gridTop}px`,
        }
    }

    const idToIndex = new Map<string, number>(
        data.columns.map((c, i) => [c.id, i])
    );

    const GetColumnIdx = (columnId: string): number => {
        const idx = idToIndex.get(columnId);
        if (idx === undefined) {
            throw new Error(`Column '${columnId}' not found in relation data`);
        }
        return idx;
    };

    const GetColumn = (columnId: string) =>
        data.rows.map(row => row[GetColumnIdx(columnId)]);

    // —————————————————————————————————————————
    // 2. Pie Chart
    // —————————————————————————————————————————
    if (plot.type === "pie") {

        const {
            label: labelAxis,
            radius: radiusAxis
        } = plot.pie.axis;

        if (!labelAxis || !radiusAxis) {
            throw new Error("Pie chart requires both label and radius axis.");
        }

        const labelIdx = GetColumnIdx(labelAxis.columnId);
        const radiusIdx = GetColumnIdx(radiusAxis.columnId);
        const dec = radiusAxis.decoration.pie;
        //
        const seriesData = data.rows.map(row => ({
            name: row[labelIdx],
            value: row[radiusIdx],
        }));

        const selectedXValues = queryState.selectedXValues;
        const pieData = (interactionMode === 'click' && selectedXValues && selectedXValues.length > 0)
            ? seriesData.map(item => ({
                ...item,
                itemStyle: {opacity: selectedXValues.includes(item.name) ? 1.0 : 0.25},
            }))
            : seriesData;

        return {

            ...baseConfig,
            color: DEFAULT_COLORS,
            series: [{
                type: "pie",
                radius: [dec.innerRadius, "65%"],
                center: ['50%', '58%'],
                padAngle: dec.padAngle,
                data: pieData,
                itemStyle: {
                    borderRadius: dec.cornerRadius,
                },
                label: dec.showLabels ? {
                    formatter: "{b}: {c}",
                    color: textColor,
                    fontSize: dec.label.fontSize,
                    fontFamily: dec.label.fontFamily,
                } : {show: false},
            }],
        };
    }

    // —————————————————————————————————————————
    // 3. Cartesian‑based diagrams (Bar, Line, Area, Scatter)
    // —————————————————————————————————————————
    if (plotIsCartesian(plot)) {

        const {cartesian} = plot;

        // x‑Data
        const xData = cartesian.xAxis
            ? GetColumn(cartesian.xAxis.columnId)
            : data.rows.map((_, i) => i);

        // Determine xAxis type based on configuration or column type
        let xAxisType = cartesian.xAxisType;
        if (!xAxisType && cartesian.xAxis) {
            // Auto-determine type based on column type
            const xColumn = data.columns.find(col => col.id === cartesian.xAxis?.columnId);
            if (xColumn) {
                if (xColumn.type === 'Timestamp') {
                    xAxisType = 'time';
                } else if (xColumn.type === 'Integer' || xColumn.type === 'Float') {
                    xAxisType = 'value';
                } else {
                    xAxisType = 'category';
                }
            } else {
                xAxisType = 'category'; // Default if column not found
            }
        } else if (!xAxisType) {
            xAxisType = 'category'; // Default if no column selected
        }

        const xAxis: any = {
            type: xAxisType,
            boundaryGap: plot.type === "bar",
            data: xData,
            axisLabel: {color: textColor},
            nameTextStyle: {color: textColor},
        };
        // x-axis label: rendered as a bottom-pinned graphic (not xAxis.name) so it
        // sits below the tick labels instead of overlapping them.
        const graphic: any[] = [];
        if (cartesian.xLabel) {
            graphic.push({
                type: 'text',
                left: 'center',
                bottom: 12,
                style: {
                    text: cartesian.xLabel,
                    fill: textColor,
                    fontSize: 12,
                    textAlign: 'center',

                },
            });
        }
        if (cartesian.xRange.start !== undefined) {
            xAxis.min = cartesian.xRange.start;
        } else {
            xAxis.min = 'dataMin';
        }
        if (cartesian.xRange.end !== undefined) {
            xAxis.max = cartesian.xRange.end;
        } else {
            xAxis.max = 'dataMax';
        }
        if (cartesian?.xLabelRotation) {
            xAxis.axisLabel = {
                ...xAxis.axisLabel,
                interval: 0,
                rotate: cartesian.xLabelRotation,
            }
        }

        const yAxis: any = {
            type: "value",
            axisLabel: {color: textColor},
            nameTextStyle: {color: textColor},
        };
        if (cartesian.yLabel) {
            yAxis.name = cartesian.yLabel;
            yAxis.nameLocation = 'end';
            yAxis.nameTextStyle = {
                color: textColor,
                align: 'left',
                verticalAlign: 'bottom',
            };
            yAxis.nameGap = 8;
            // yAxis.name.inside = true;
        }
        if (cartesian.yRange.start !== undefined) {
            yAxis.min = cartesian.yRange.start;
        } else {
            yAxis.min = 'dataMin';
        }
        if (cartesian.yRange.end !== undefined) {
            yAxis.max = cartesian.yRange.end;
        } else {
            yAxis.max = 'dataMax';
        }
        if (cartesian?.yLabelRotation) {
            yAxis.axisLabel = {
                ...yAxis.axisLabel,
                align: 'right',
                rotate: cartesian.yLabelRotation,
            }
        }

        let series = getSeries(plot, GetColumn, data);

        // Visual dimming for click mode when values are selected
        const selectedXValues = queryState.selectedXValues;
        if (interactionMode === 'click' && selectedXValues && selectedXValues.length > 0) {
            series = series.map((s: any) => ({
                ...s,
                data: s.data.map((point: any) => {
                    const xVal = Array.isArray(point.value) ? point.value[0] : point.value;
                    const isSelected = selectedXValues.includes(xVal);
                    return {
                        ...point,
                        itemStyle: {
                            ...(point.itemStyle ?? {}),
                            opacity: isSelected ? 1.0 : 0.25,
                        },
                    };
                }),
            }));
        }

        // Brush component for range/box modes
        const brushOption = buildBrushOption(interactionMode);

        return {
            ...baseConfig,
            // containLabel reserves room for tick labels but not the graphic label, so
            // add extra bottom padding when an x-label is present.
            grid: {...baseConfig.grid, bottom: cartesian.xLabel ? '32px' : baseConfig.grid.bottom},
            xAxis,
            yAxis,
            series,
            graphic,
            ...(brushOption ? {brush: brushOption} : {}),
        };

    }

    if (plot.type === "radar") {

        const {cartesian} = plot;

        if (!cartesian.xAxis) {
            throw new Error("Radar chart requires an xAxis definition (indicators).");
        }
        if (!cartesian.yAxes || cartesian.yAxes.length === 0) {
            throw new Error("Radar chart requires at least one Y‑axis series.");
        }

        const indicators = GetColumn(cartesian.xAxis.columnId)
            .map((v: any) => ({name: String(v), max: 20}));
        const series = getSeries(plot, GetColumn, data)

        return {
            ...baseConfig,
            radar: {indicator: indicators},
            series: series
        };
    }

    // —————————————————————————————————————————
    // 5. Fallback (sollte nie erreicht werden)
    // —————————————————————————————————————————
    throw new Error(`Unsupported plot type '${plot.type}'`);
}


function getSeries(plot: PlotConfig, GetColumn: (columnId: string) => any[], data: RelationData) {

    const xAxisId = plot.cartesian.xAxis?.columnId;
    if (!xAxisId) {
        return []
    }

    const xValues = GetColumn(xAxisId);

    if (plotUsesGroup(plot)) {


        // other columns that are not the x-axis but are in the data
        const otherColumns = data.columns.filter(c => c.id !== xAxisId);
        const count = otherColumns.length;
        return otherColumns.map((c, index) => {
            const decoration = getInitialAxisDecoration(index);
            const config: AxisConfig = {
                columnId: c.id,
                decoration: decoration,
                label: c.name
            }
            return getEChartSeriesFromAxis(config, GetColumn(c.id), plot, count, xAxisId, xValues);
        })
    }

    const {cartesian} = plot;
    const yAxisCount = (plot.cartesian.yAxes ?? []).length;

    // series for y-axis
    return (cartesian.yAxes ?? []).map((axis, index) => {
        let vals = GetColumn(axis.columnId);
        return getEChartSeriesFromAxis(axis, vals, plot, yAxisCount, xAxisId, xValues);
    })
}


function buildBrushOption(mode: ChartInteractionMode): object | null {
    if (mode === 'x-range') {
        return {toolbox: [], brushType: 'lineX', brushMode: 'single', throttleDelay: 100};
    }
    if (mode === 'y-range') {
        return {toolbox: [], brushType: 'lineY', brushMode: 'single', throttleDelay: 100};
    }
    if (mode === 'box') {
        return {toolbox: [], brushType: 'rect', brushMode: 'single', throttleDelay: 100};
    }
    return null;
}


function getEChartSeriesFromAxis(axis: AxisConfig, values: any[], plot: PlotConfig, yAxisCount: number, xAxisId: string, xValues: any[]): any {
    const dec = axis.decoration;

    if (plot.type === 'radar') {
        values = [
            {
                value: values
            }
        ]
    }

    const valuesMapList = values.map((value, index) => {
        const xValue = xValues[index];
        return {
            name: xValues[index],
            value: [xValue, value],
        }
    })

    const base: any = {
        name: axis.columnId,
        type: plot.type === "area" ? "line" : plot.type, // Area = Line + areaStyle
        data: valuesMapList,
        color: dec.color,
    };

    switch (plot.type) {
        case "bar":
            if (dec.bar.barWidth) {
                base.barWidth = dec.bar.barWidth;
            } else {
                const percentage = 0.8 / yAxisCount
                base.barWidth = `${percentage * 100}%`
            }
            base.itemStyle = {
                borderRadius: dec.bar.cornerRadius,
                opacity: dec.bar.fillOpacity,
                borderWidth: dec.bar.border.width,
                borderColor: dec.bar.border.color,
            };
            base.stack = plot.cartesian.decoration.bar.stacked ? "total" : undefined;

            break;

        case "line":
        case "area":
        case "scatter":
        case "radar":
            base.lineStyle = {
                color: dec.color,
                width: dec.line.stroke.width,
                type: dec.line.stroke.lineStyle || 'solid',
            };
            if (plot.type === "line" || plot.type === "area") {
                base.smooth = dec.line.smooth;
            }
            base.symbol = dec.scatter.dots.visible || plot.type === 'scatter' ? dec.scatter.dots.shape : "none";
            base.symbolSize = dec.scatter.dots.radius;
            base.itemStyle = {
                color: dec.scatter.dots.fill,
                borderWidth: dec.scatter.dots.borderWidth,
                borderColor: dec.color,

            };
            if (plot.type === "area" || plot.type === "radar") {
                base.areaStyle = {
                    opacity: dec.area.fill.opacity,
                    color: dec.area.fill.color,
                };
            } else {
                base.areaStyle = undefined;
            }

            break;
    }
    return base;

}
