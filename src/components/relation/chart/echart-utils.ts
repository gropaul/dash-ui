import {AxisConfig, ChartConfig, getInitialAxisDecoration, PlotConfig} from "@/model/relation-view-state/chart";
import {RelationData} from "@/model/relation";
import {EChartsOption} from "echarts-for-react/src/types";


export function plotIsCartesian(plot: PlotConfig) {
    return ["bar", "line", "area", "scatter"].includes(plot.type)
}

export function plotUsesGroup(plot: PlotConfig) {
    return plotIsCartesian(plot) && plot.cartesian.groupBy
}

export function toEChartOptions(
    config: ChartConfig,
    data: RelationData
): EChartsOption {

    const {plot} = config;

    const baseConfig = {
        title: {
            text: plot.title ? plot.title : '',
            left: 'center',
            top: 4, // You can also use '10px' or a number like 10
        },
        tooltip: {trigger: 'axis'},
        legend: {
            type: 'scroll',
            selectedMode: true,
            orient: 'horizontal',
            top: 28, // Adjust so it's below the title
        },
        grid: {
            containLabel: true,
            left: '3%',
            right: '3%',
            bottom: '3%',
            top: '15%'
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

        return {

            ...baseConfig,
            series: [{
                type: "pie",
                radius: [dec.innerRadius, "60%"],
                padAngle: dec.padAngle,
                data: seriesData,
                itemStyle: {
                    borderRadius: dec.cornerRadius,
                },
                label: dec.showLabels ? {
                    formatter: "{b}: {c}",
                    color: dec.label.color,
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
            boundaryGap: plot.type === "bar", // true for bar charts, false for others (boundary between first value and y-axis)
            data: xData
        };
        if (cartesian.xLabel) {
            xAxis.name = cartesian.xLabel
            xAxis.nameLocation = 'center';
            xAxis.nameGap = 30;
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
                interval: 0,
                rotate: cartesian.xLabelRotation,
            }
        }

        const yAxis: any = {type: "value"};
        if (cartesian.yLabel) {
            yAxis.name = cartesian.yLabel;
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
                align: 'left',
                rotate: cartesian.yLabelRotation,
            }
        }

        const series = getSeries(plot, GetColumn, data);

        return {
            ...baseConfig,
            xAxis,
            yAxis,
            series,
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
