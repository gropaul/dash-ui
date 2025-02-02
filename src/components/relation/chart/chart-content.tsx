"use client"

import {ChartConfig as RechartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,} from "@/components/ui/chart"
import {RelationData} from "@/model/relation";
import {ChartConfig} from "@/model/relation-view-state/chart";
import {getDataForPieChartElement, getReChartDataFromConfig} from "@/components/relation/chart/rechart/utils";
import {H5} from "@/components/ui/typography";
import {ChartWrapper} from "@/components/relation/chart/chart-content/chart-wrapper";
import {ChartDataElement} from "@/components/relation/chart/chart-content/chart-data-element";
import {ChartDecoration} from "@/components/relation/chart/chart-content/chart-decoration";
import {cn} from "@/lib/utils";

const chartConfig = {} satisfies RechartConfig

export interface MyChartProps {
    embedded?: boolean,
    data: RelationData,
    hideTitleIfEmpty?: boolean,
    config: ChartConfig
}

export function ChartContent({data, config, hideTitleIfEmpty = false, embedded = false}: MyChartProps) {
    const emptyTitle = config.plot.title === undefined || config.plot.title === '';
    const showTitle = !hideTitleIfEmpty || !emptyTitle;
    const chartData = getReChartDataFromConfig(data, config);


    const headerHeight = embedded ? 'h-[26px]' : 'h-10';
    return (
        <div className="h-full flex flex-col items-center">
            { showTitle && (
                <div className={cn("flex items-center justify-center", headerHeight)}>
                    <H5>{config.plot.title}</H5>
                </div>
            )}
            <div className="flex-grow w-full min-h-4 no-outline">
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
