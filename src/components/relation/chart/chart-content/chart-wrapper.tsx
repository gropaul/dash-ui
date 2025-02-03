import {PlotType} from "@/model/relation-view-state/chart";
import {AreaChart, BarChart, LineChart, PieChart, RadarChart, ScatterChart} from "recharts";
import {ReactNode} from "react";


interface ChartWrapperProps {
    plotType: PlotType,
    data: any[],
    children: ReactNode
}

export function ChartWrapper(props: ChartWrapperProps) {

    const margin = {top: 12, right: 16, bottom: 16, left: 0}
    switch (props.plotType) {
        case 'bar':
            return <BarChart margin={margin} data={props.data}>{props.children}</BarChart>
        case 'area':
            return <AreaChart margin={margin} data={props.data}>{props.children}</AreaChart>
        case 'line':
            return <LineChart margin={margin} data={props.data}>{props.children}</LineChart>
        case 'scatter':
            return <ScatterChart margin={margin} data={props.data}>{props.children}</ScatterChart>
        case 'pie':
            return <PieChart margin={margin} data={props.data}>{props.children}</PieChart>
        case 'radar':
            return <RadarChart cx="50%" cy="50%" outerRadius="80%" margin={margin} data={props.data}>{props.children}</RadarChart>
        default:
            throw new Error(`Unknown plot type ${props.plotType}`)
    }
}