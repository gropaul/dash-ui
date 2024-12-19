import {CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, XAxis, YAxis} from "recharts";
import {ChartConfig, ChartViewState, PlotType} from "@/model/relation-view-state/chart";


interface ChartDecorationProps {
    config: ChartConfig;
}


export function ChartDecoration(props: ChartDecorationProps) {

    const {config} = props;

    return <>
        {showCartesianElementsFor(config.plot.type) &&
            <>
                <CartesianGrid vertical={false}/>
                {config.plot.xAxis && (<XAxis
                    dataKey={config.plot.xAxis.columnId}
                    tickLine={false}
                    tickMargin={10}
                    axisLine={true}
                />)}

                <YAxis domain={['auto', 'auto']}/>
            </>
        }
        {showRadarElementsFor(config.plot.type) &&
            <>
                {config.plot.xAxis && (
                    <PolarAngleAxis dataKey={config.plot.xAxis.columnId}/>
                )}
                {config.plot.yAxes && (
                    <PolarRadiusAxis/>
                )}
                { /* only have a polar grid if we have a x and y axis */}
                {config.plot.xAxis && config.plot.yAxes && (
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