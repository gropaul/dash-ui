import {ChartConfig, PlotConfig} from "@/model/relation-view-state/chart";
import {RelationData} from "@/model/relation";
import {EChartsOption} from "echarts-for-react/src/types";

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
        tooltip: { trigger: 'axis' },
        legend: {
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

    const col = (columnId: string): number => {
        const idx = idToIndex.get(columnId);
        if (idx === undefined) {
            throw new Error(`Column '${columnId}' not found in relation data`);
        }
        return idx;
    };

    const valueVector = (columnId: string) =>
        data.rows.map(row => row[col(columnId)]);

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

        const labelIdx = col(labelAxis.columnId);
        const radiusIdx = col(radiusAxis.columnId);
        const dec = radiusAxis.decoration.pie;

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
    if (["bar", "line", "area", "scatter"].includes(plot.type)) {

        const {cartesian} = plot;

        // x‑Data
        const xData = cartesian.xAxis
            ? valueVector(cartesian.xAxis.columnId)
            : data.rows.map((_, i) => i);

        const xAxis: any = {type: "category", data: xData};
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
        if (cartesian.yLabel) yAxis.name = cartesian.yLabel;
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
                interval: 0,
                rotate: cartesian.yLabelRotation,
            }
        }

        const series = getSeries(plot, valueVector);

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

        const indicators = valueVector(cartesian.xAxis.columnId)
            .map((v: any) => ({name: String(v), max: 20}));
        const series = getSeries(plot, valueVector)

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



function getSeries(plot: PlotConfig, valueVector: (columnId: string) => any[]) {

    const {cartesian} = plot;
    const yAxisCount = (plot.cartesian.yAxes ?? []).length;


    // series for y-axis
    return (cartesian.yAxes ?? []).map((axis, index) => {
        let vals = valueVector(axis.columnId);
        const dec = axis.decoration;

        if (plot.type === 'radar' ){
            vals = [
                {
                    value: vals
                }
            ]
        }


        const base: any = {
            name: axis.columnId,
            type: plot.type === "area" ? "line" : plot.type, // Area = Line + areaStyle
            data: vals,
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
                    type: dec.line.stroke.dashArray,
                };
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
    })
}
