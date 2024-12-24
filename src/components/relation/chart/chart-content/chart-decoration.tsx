import {CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, XAxis, YAxis} from "recharts";
import {ChartConfig, ChartViewState, PlotType} from "@/model/relation-view-state/chart";
import {RelationData} from "@/model/relation";


interface ChartDecorationProps {
    config: ChartConfig;
    data: RelationData
}


export function ChartDecoration(props: ChartDecorationProps) {

    const {config} = props;

    let xAxisLabelAngle = 0;
    let xAxisHeight = 30;
    let xAxisTextAnchor = 'middle';
    if (config.plot.cartesian.xAxis !== undefined) {
        const xAxisName = config.plot.cartesian.xAxis.columnId;
        const xAxisIndex = props.data.columns.findIndex((column) => column.id === xAxisName);

        // if there is any data in the x axis
        if (props.data.rows.length > 0 && xAxisIndex !== -1) {
            const firstElement = props.data.rows[0][xAxisIndex];
            const isText = typeof firstElement === 'string';

            if (isText) {
                // Create a canvas context to measure text dimensions
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (context) {
                    // Set the font style to match your chart's font
                    context.font = "12px Arial"; // Adjust font size and style as needed

                    // Find the maximum text width dynamically
                    const maxTextLength = props.data.rows.reduce((max: number, row: any[]) => {
                        const text = String(row[xAxisIndex]); // Ensure text is a string
                        const textWidth = context.measureText(text).width;
                        return Math.max(max, textWidth);
                    }, 0);

                    xAxisLabelAngle = maxTextLength > 80 ? -90 : 0; // Adjust threshold dynamically if needed
                    xAxisTextAnchor = maxTextLength > 80 ? 'end' : 'middle'
                    // Scale height based on the measured text width
                    xAxisHeight = Math.max(30, Math.min(200, maxTextLength)) + 8;
                }
            }
        }
    }

    return <>
        {showCartesianElementsFor(config.plot.type) &&
            <>
                <CartesianGrid vertical={false}/>
                {config.plot.cartesian.xAxis && (
                    <XAxis
                        dataKey={config.plot.cartesian.xAxis.columnId}
                        height={xAxisHeight}
                        angle={xAxisLabelAngle}
                        textAnchor={xAxisTextAnchor}
                    />
                )}
                <YAxis domain={['auto', 'auto']}/>
            </>
        }
        {showRadarElementsFor(config.plot.type) &&
            <>
                {config.plot.cartesian.xAxis && (
                    <PolarAngleAxis dataKey={config.plot.cartesian.xAxis.columnId}/>
                )}
                {config.plot.cartesian.yAxes && (
                    <PolarRadiusAxis/>
                )}
                { /* only have a polar grid if we have a x and y axis */}
                {config.plot.cartesian.xAxis && config.plot.cartesian.yAxes && (
                    <PolarGrid/>
                )}
            </>
        }
    </>
}

function showRadarElementsFor(type: PlotType) {
    switch (type) {
        case 'radar':
            return true;
        default:
            return false;
    }
}

function showCartesianElementsFor(type: PlotType) {
    switch (type) {
        case 'bar':
        case 'line':
        case 'area':
        case 'scatter':
            return true;
        default:
            return false;
    }
}