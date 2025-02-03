import {CartesianGrid, Label, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, XAxis, YAxis} from "recharts";
import {ChartConfig, PlotType, rangeDefined, transformRange} from "@/model/relation-view-state/chart";
import {RelationData} from "@/model/relation";
import {useEffect, useState} from "react";

interface ChartDecorationProps {
    config: ChartConfig;
    data: RelationData;
}

export function ChartDecoration(props: ChartDecorationProps) {
    const {config} = props;

    const [yMaxTickLength, setYMaxTickLength] = useState(0);
    const [xMaxTickLength, setXMaxTickLength] = useState(0);

    useEffect(() => {
        // Reset yMaxTickLength and xMaxTickLength when data changes
        setYMaxTickLength(0);
        setXMaxTickLength(0);
    }, [props.data, props.config.plot.cartesian.xAxis, props.config.plot.cartesian.yAxes]);

    function onYAxisCallback(value: number) {
        if (value > yMaxTickLength) {
            setYMaxTickLength(value);
        }
    }

    function onXAxisCallback(value: number) {
        if (value > xMaxTickLength) {
            setXMaxTickLength(value);
        }
    }

    let xAxisLabelAngle = 0;
    let xAxisHeight = 30;

    let yAxisWidth = 40;

    if (config.plot.cartesian.xAxis !== undefined) {

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (context) {
            context.font = "12px Arial";

            const text = '0'.repeat(xMaxTickLength);
            const maxTextLength = context.measureText(text).width;

            xAxisLabelAngle = maxTextLength > 80 ? -90 : 0;
            xAxisHeight = maxTextLength > 80 ? Math.max(30, Math.min(200, maxTextLength)) + 8 : 30;
        }


    }

    if (config.plot.cartesian.yAxes !== undefined) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (context) {
            context.font = "12px Arial";

            const text = '0'.repeat(yMaxTickLength);
            const maxTextLength = context.measureText(text).width;
            yAxisWidth = Math.max(0, Math.min(100, maxTextLength)) + 8;
        }
    }

    return (
        <>
            {showCartesianElementsFor(config.plot.type) && (
                <>
                    <Legend/>

                    <CartesianGrid vertical={false}/>
                    {config.plot.cartesian.xAxis && (
                        <XAxis
                            allowDataOverflow={true}
                            type={rangeDefined(config.plot.cartesian.xRange) ? 'number' : undefined}
                            domain={transformRange(config.plot.cartesian.xRange)}
                            dataKey={config.plot.cartesian.xAxis.columnId}
                            height={xAxisHeight}
                            angle={xAxisLabelAngle}
                            tick={<CustomXTick callback={onXAxisCallback}/>} // Use callback for X-axis
                        >
                            <Label
                                style={{
                                    textAnchor: "middle",
                                    fontSize: "120%",
                                }}
                                position={'insideBottom'}
                                offset={0}
                                value={config.plot.cartesian.xLabel}/>
                        </XAxis>
                    )}
                    <YAxis
                        allowDataOverflow={true}
                        type={rangeDefined(config.plot.cartesian.xRange) ? 'number' : undefined}
                        domain={transformRange(config.plot.cartesian.yRange)}
                        width={yAxisWidth + 16}
                        tick={<CustomYTick callback={onYAxisCallback}/>} // Use callback for Y-axis
                    >
                        <Label
                            style={{
                                textAnchor: "middle",
                                fontSize: "120%",
                            }}
                            angle={270}
                            offset={6}
                            position={'insideLeft'}
                            value={config.plot.cartesian.yLabel}
                        />

                    </YAxis>
                </>
            )}
            {showRadarElementsFor(config.plot.type) && (
                <>
                    {config.plot.cartesian.xAxis && (
                        <PolarAngleAxis dataKey={config.plot.cartesian.xAxis.columnId}/>
                    )}
                    {config.plot.cartesian.yAxes && (
                        <PolarRadiusAxis/>
                    )}
                    {config.plot.cartesian.xAxis && config.plot.cartesian.yAxes && (
                        <PolarGrid/>
                    )}
                </>
            )}
        </>
    );
}

function CustomYTick(props: any) {
    const {x, y, payload, callback} = props;

    useEffect(() => {
        callback(String(payload.value).length);
    }, [payload.value, callback]);

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} textAnchor="end" dy={4}>
                {payload.value}
            </text>
        </g>
    );
}

function CustomXTick(props: any) {
    const {x, y, payload, callback, angle} = props;

    useEffect(() => {
        callback(String(payload.value).length);
    }, [payload.value, callback]);

    const textAnchor = angle === 0 ? 'middle' : 'end';
    const dy = angle === 0 ? 8 : 4;

    // make dy adaptive to the angle using cos and sin
    // const dyAdjust = Math.abs(Math.cos(angle * Math.PI / 180) * 4);
    return (
        <g transform={`translate(${x},${y}) rotate(${angle})`}>
            <text x={0} y={0} textAnchor={textAnchor} dy={dy}>
                {payload.value}
            </text>
        </g>
    );
}

function showRadarElementsFor(type: PlotType): boolean {
    return type === 'radar';
}

function showCartesianElementsFor(type: PlotType): boolean {
    return ['bar', 'line', 'area', 'scatter'].includes(type);
}
