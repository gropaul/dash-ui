"use client"

import {Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts"

import {
    ChartConfig as RechartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {RelationData} from "@/model/relation";
import {ChartConfig} from "@/model/relation-view-state/chart";
import {getReChartDataFromConfig} from "@/components/relation/chart/rechart/utils";
import {CardTitle} from "@/components/ui/card";
import {H1, H3, H4, H5} from "@/components/ui/typography";

const chartConfig = {} satisfies RechartConfig

export interface MyChartProps {
    data: RelationData,
    config: ChartConfig
}

export function ChartContent({data, config}: MyChartProps) {

    const chartData = getReChartDataFromConfig(data, config);
    return (
        <div className="w-full h-full flex flex-col items-center">
            {config.plot.title && (
                <H5>{config.plot.title}</H5>
            )}
            <div className="flex-grow w-full min-h-4">
                <ChartContainer config={chartConfig} className={"w-full h-full"}>
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false}/>
                        {config.plot.xAxis && (<XAxis
                            dataKey={config.plot.xAxis.columnId}
                            tickLine={false}
                            tickMargin={10}
                            axisLine={true}
                        />)}

                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent/>}
                        />
                        {
                            config.plot.yAxes?.map((axis, index) => (
                                <>
                                    <Bar key={index} dataKey={axis.columnId} radius={4} fill={axis.color}/>
                                </>
                            ))
                        }
                        <YAxis domain={[0, 'auto']} tickCount={5} />

                    </BarChart>
                </ChartContainer>
            </div>
        </div>
    )
}
