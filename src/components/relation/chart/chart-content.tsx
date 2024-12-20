"use client"

import {Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts"

import {ChartConfig as RechartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,} from "@/components/ui/chart"
import {RelationData} from "@/model/relation";
import {ChartConfig} from "@/model/relation-view-state/chart";
import {getDataForPieChartElement, getReChartDataFromConfig} from "@/components/relation/chart/rechart/utils";
import {H5} from "@/components/ui/typography";
import {ChartWrapper} from "@/components/relation/chart/chart-content/chart-wrapper";
import {ChartDataElement} from "@/components/relation/chart/chart-content/chart-data-element";
import {ChartDecoration} from "@/components/relation/chart/chart-content/chart-decoration";

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
                    {
                        ChartWrapper({
                            plotType: config.plot.type,
                            data: chartData,
                            children: (
                                <>

                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent/>}
                                    />
                                    {
                                        ChartDecoration({config, data})
                                    }
                                    {config.plot.type !== 'pie' &&
                                        config.plot.cartesian.yAxes?.map((axis, index) => (<>
                                            {   // we need to call the Custom components like this because of rechart madness
                                                //https://stackoverflow.com/questions/55998730/how-to-create-custom-components-for-rechart-components
                                                ChartDataElement({
                                                    type: config.plot.type,
                                                    axis: axis,
                                                })
                                            }
                                        </>))
                                    }
                                    {config.plot.type === 'pie' && config.plot.pie.axis.radius && (<>
                                        {   // we need to call the Custom components like this because of rechart madness
                                            //https://stackoverflow.com/questions/55998730/how-to-create-custom-components-for-rechart-components
                                            ChartDataElement({
                                                type: config.plot.type,
                                                elementData: getDataForPieChartElement(config.plot.pie.axis, data),
                                                axis: config.plot.pie.axis.radius,
                                                nameKey: config.plot.pie.axis.label?.columnId,
                                            })
                                        }
                                    </>)
                                    }
                                </>
                            )
                        })
                    }
                </ChartContainer>
            </div>
        </div>
    )
}
