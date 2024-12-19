import {Area, Bar, Line, Pie, Radar, Scatter} from "recharts";
import {AxisConfig, PlotType} from "@/model/relation-view-state/chart";



interface ChartDataElementProps {
    type: PlotType;
    axis: AxisConfig;
    elementData?: any;
}


export function ChartDataElement(props: ChartDataElementProps) {
    switch (props.type) {
        case 'line':
            return <Line
                data={undefined}
                dataKey={props.axis.columnId}
                type="natural"
                stroke={props.axis.color}
                strokeWidth={2}
                dot={{
                    fill: props.axis.color,
                }}
                activeDot={{
                    r: 6,
                }}
            />
        case 'bar':
            return <Bar
                dataKey={props.axis.columnId}
                fill={props.axis.color}
                radius={8}
            />
        case 'area':
            return <Area
                dataKey={props.axis.columnId}
                type="natural"
                fill={props.axis.color}
                fillOpacity={0.4}
                stroke={props.axis.color}
            />
        case "scatter":
            return <Scatter
                dataKey={props.axis.columnId}
                fill={props.axis.color}
                radius={4}
            />
        case "pie":

            return <Pie
                data={props.elementData}
                dataKey={props.axis.columnId}
                fill={props.axis.color}
            />
        case "radar":
            return <Radar
                dataKey={props.axis.columnId}
                stroke={props.axis.color}
                fill={props.axis.color}
                fillOpacity={0.2}
            />
        default:
            throw new Error(`Unknown plot type ${props.type}`)

    }
}