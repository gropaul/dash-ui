import {CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, XAxis, YAxis} from "recharts";
import {ChartConfig, PlotType} from "@/model/relation-view-state/chart";
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
    }, [props.data]);

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
    let xAxisTextAnchor = 'middle';

    let yAxisWidth = 40;

    if (config.plot.cartesian.xAxis !== undefined) {

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (context) {
            context.font = "12px Arial";

            const text = '0'.repeat(xMaxTickLength);
            const maxTextLength = context.measureText(text).width;

            xAxisLabelAngle = maxTextLength > 80 ? -90 : 0;
            xAxisTextAnchor = maxTextLength > 80 ? 'end' : 'middle';
            xAxisHeight = Math.max(30, Math.min(200, maxTextLength)) + 8;
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
                    <CartesianGrid vertical={false}/>
                    {config.plot.cartesian.xAxis && (
                        <XAxis
                            dataKey={config.plot.cartesian.xAxis.columnId}
                            height={xAxisHeight}
                            angle={xAxisLabelAngle}
                            textAnchor={xAxisTextAnchor}
                            tick={<CustomXTick callback={onXAxisCallback}/>} // Use callback for X-axis
                        />
                    )}
                    <YAxis
                        domain={['auto', 'auto']}
                        width={yAxisWidth}
                        tick={<CustomYTick callback={onYAxisCallback}/>} // Use callback for Y-axis
                    />
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
    const {x, y, payload, callback} = props;

    useEffect(() => {
        callback(String(payload.value).length);
    }, [payload.value, callback]);

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={12} textAnchor="middle">
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
