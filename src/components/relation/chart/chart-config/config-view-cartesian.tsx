import {Label} from "@/components/ui/label";
import {H5, Muted, Small} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {CirclePlus, Info, Lock} from "lucide-react";
import {AxisConfig, AxisRange, getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {ChartConfigProps} from "@/components/relation/chart/chart-config-view";
import {Column} from "@/model/column";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Switch} from "@/components/ui/switch";
import React from "react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";


export function ConfigViewCartesian(props: ChartConfigProps) {

    const config = props.relationState.viewState.chartState;
    const noYAxes = !config.chart.plot.cartesian.yAxes || config.chart.plot.cartesian.yAxes.length === 0;
    const relationId = props.relationState.id;

    function deleteYAxis(index: number) {
        updateYAxis(index, undefined);
    }

    async function updateXAxis(axis: Partial<AxisConfig> | undefined) {

        const newState: DeepPartial<RelationViewState> = {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            // @ts-ignore
                            xAxis: axis
                        }
                    }
                }
            }
        }
        await updateDataForGroupBy(newState);

        props.updateRelationViewState(relationId, newState);
    }

    function updateAxisRange(range: AxisRange, axis: 'xRange' | 'yRange') {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            [axis]: range,
                        }
                    }
                }
            }
        });
    }

    async function updateYAxis(index: number, update: Partial<AxisConfig> | undefined) {
        const yAxes = config.chart.plot.cartesian.yAxes ?? ([] as Partial<AxisConfig>[]);

        if (update === undefined) {
            // Delete the axis at the specified index
            if (index < yAxes.length) {
                yAxes.splice(index, 1);
            }
        } else if (yAxes.length <= index) {
            yAxes.push(update);
        } else {
            yAxes[index] = {
                ...yAxes[index],
                ...update,
            };
        }
        const newState: DeepPartial<RelationViewState> = {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            // @ts-ignore
                            yAxes: yAxes,
                        }
                    }
                }
            }
        }

        await updateDataForGroupBy(newState);
        props.updateRelationViewState(relationId, newState);
    }

    function updateXLabel(label: string) {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            xLabel: label,
                        }
                    }
                }
            }
        });
    }

    function updateYLabel(label: string) {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            yLabel: label,
                        }
                    }
                }
            }
        });
    }

    function updateXTickAngle(angle: string) {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            xLabelRotation: parseString(angle),
                        }
                    }
                }
            }
        });
    }

    function updateYTickAngle(angle: string) {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            yLabelRotation: parseString(angle),
                        }
                    }
                }
            }
        });
    }

    function updateBar(update: { stacked?: boolean }) {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            decoration: {
                                bar: {
                                    stacked: update.stacked,
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    async function updateDataForGroupBy(update: DeepPartial<RelationViewState>) {

        const copy = deepClone(update);
        const updated = safeDeepUpdate( props.relationState.viewState, copy);

        const xAxisId = updated.chartState?.chart?.plot?.cartesian?.xAxis?.columnId;
        const yAxisId = updated.chartState?.chart?.plot?.cartesian?.yAxes?.[0]?.columnId;
        const groupById = updated.chartState?.chart?.plot?.cartesian?.groupBy?.columnId;

        console.log('groupById', groupById);

        const xAxisChanged = props.relationState.query.viewParameters.chart.xAxis !== xAxisId;
        const yAxisChanged = props.relationState.query.viewParameters.chart.yAxes?.[0] !== yAxisId;
        const groupByChanged = props.relationState.query.viewParameters.chart.groupBy !== groupById;

        // Only update if the groupById is different and all data is ready
        if ((xAxisChanged || yAxisChanged || groupByChanged) && xAxisId && yAxisId) {
            await props.updateRelationDataWithParams(relationId, {
                ...props.relationState.query.viewParameters,
                chart: {
                    xAxis: xAxisId,
                    yAxes: [yAxisId],
                    groupBy: groupById,
                }
            })
        }
    }

    async function updateGroupAxis(update: Partial<AxisConfig> | undefined) {

        const newState: DeepPartial<RelationViewState> = {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            // @ts-ignore
                            groupBy: update
                        }
                    }
                }
            }
        }

        await updateDataForGroupBy(newState);
        props.updateRelationViewState(relationId, newState);


    }

    const columns = props.relationState?.data?.columns ?? ([] as Column[]);

    const yAxis = config.chart.plot.cartesian.yAxes;

    const showStackedBars = config.chart.plot.type == 'bar' && (yAxis?.length ?? 0) > 1;
    const showGroupBy = config.chart.plot.type !== 'radar' && (yAxis == undefined || yAxis?.length == 0 || yAxis?.length === 1);

    const disableAddYAxis = config.chart.plot.cartesian.groupBy !== undefined;

    return (
        <>
            <Label className={'h-3'}><Muted>Data</Muted></Label>
            <ColumnSelector
                plotType={config.chart.plot.type}
                axisType={"x"}
                axis={config.chart.plot.cartesian.xAxis}
                columns={columns}
                deleteAxis={() => updateXAxis(undefined)}
                updateAxis={(update) => updateXAxis(update)}
            />
            {yAxis?.map((yAxis, index) => (
                <ColumnSelector
                    plotType={config.chart.plot.type}
                    axisType={"y"}
                    key={index}
                    axis={yAxis}
                    deleteAxis={() => deleteYAxis(index)}
                    columns={columns}
                    updateAxis={(update) => updateYAxis(index, update)}
                />
            ))}
            {noYAxes && (
                <ColumnSelector
                    plotType={config.chart.plot.type}
                    axisType={"y"}
                    columns={columns}
                    updateAxis={(update) =>
                        updateYAxis(0, {
                            decoration: getInitialAxisDecoration(0),
                            ...update,
                        })
                    }
                />
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={disableAddYAxis}
                            className="w-auto justify-start px-2"
                            onClick={() =>
                                updateYAxis(config.chart.plot.cartesian.yAxes!.length, {
                                    decoration: {
                                        ...getInitialAxisDecoration(config.chart.plot.cartesian.yAxes!.length),
                                    },
                                })
                            }
                        >
                            <div className="w-4 h-4 mr-1 flex items-center justify-center">
                                {
                                    disableAddYAxis
                                        ? <Lock className="w-4 h-4 text-muted-foreground"/>
                                        : <CirclePlus className="w-4 h-4 text-muted-foreground"/>
                                }

                            </div>
                            <Small className="text-gray-500">Add Y-Axis</Small>
                        </Button>

                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="text-sm">
                            {disableAddYAxis
                                ? "You can only add one Y-Axis if you have a group by column."
                                : "Add Y-Axis"}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {(showGroupBy) && (
                <>
                    <ColumnSelector
                        plotType={config.chart.plot.type}
                        axisType={"group"}
                        axis={config.chart.plot.cartesian.groupBy}
                        columns={columns}
                        deleteAxis={() => updateGroupAxis(undefined)}
                        updateAxis={(update) => updateGroupAxis(update)}
                    />
                </>
            )}
            {config.chart.plot.type !== 'radar' && <>
                <div className={'pb-1'}>
                    <H5>X-Axis</H5>
                    <Separator/>
                </div>
                <Label className={'h-3'}><Muted>Label</Muted></Label>
                <Input
                    type="text"
                    id="x-axis-label"
                    placeholder="None"
                    value={config.chart.plot.cartesian.xLabel}
                    onChange={(e) => updateXLabel(e.target.value)}
                />
                <AxisRangeWidget
                    range={config.chart.plot.cartesian.xRange}
                    updateRange={(range) => updateAxisRange(range, 'xRange')}
                />
                <Label className={'h-3'}><Muted>Tick Angle</Muted></Label>
                <Input
                    type="number"
                    id="x-tick-angle"
                    min={-90}
                    max={90}
                    step={1}
                    placeholder="0"
                    value={config.chart.plot.cartesian?.xLabelRotation ?? ''}
                    onChange={(e) => updateXTickAngle(e.target.value)}
                />
                {
                    showStackedBars && <div className={'flex flex-row gap-2 items-center'}>
                        <Muted>Stacked Bars</Muted>
                        <Switch
                            checked={config.chart.plot.cartesian?.decoration?.bar?.stacked}
                            onCheckedChange={(checked) => updateBar({stacked: checked})}
                        />
                    </div>
                }

                <div className={'pb-1'}>
                    <H5>Y-Axis</H5>
                    <Separator/>
                </div>
                <Label className={'h-3'}><Muted>Label</Muted></Label>
                <Input
                    type="text"
                    id="y-axis-label"
                    placeholder="None"
                    value={config.chart.plot.cartesian.yLabel}
                    onChange={(e) => updateYLabel(e.target.value)}
                />
                <AxisRangeWidget
                    range={config.chart.plot.cartesian.yRange}
                    updateRange={(range) => updateAxisRange(range, 'yRange')}
                />
                <Label className={'h-3'}><Muted>Tick Angle</Muted></Label>
                <Input
                    type="number"
                    id="y-tick-angle"
                    min={-90}
                    max={90}
                    step={1}
                    placeholder="0"
                    value={config.chart.plot.cartesian?.yLabelRotation ?? ''}
                    onChange={(e) => updateYTickAngle(e.target.value)}
                />
            </>}
        </>
    )
}


export interface AxisRangeWidgetProps {
    range: AxisRange;
    updateRange: (range: AxisRange) => void;
}


// get as number, undefined if not a number or empty
export function parseString(value: string): number | undefined {
    if (value === '') {
        return undefined;
    } else {
        const num = Number(value);
        return isNaN(num) ? undefined : num;
    }
}

export function AxisRangeWidget(props: AxisRangeWidgetProps) {

    let localRange = props.range;
    if (!localRange) {
        localRange = {};
    }

    function updateStart(start: string) {
        props.updateRange({
            ...props.range,
            start: parseString(start),
        });
    }

    function updateEnd(end: string) {
        props.updateRange({
            ...props.range,
            end: parseString(end),
        });
    }

    return (
        <>
            <Label className={'h-3'}><Muted>Range</Muted></Label>
            <div className={'flex flex-row gap-2 items-center'}>
                <Input
                    type="number"
                    id="x-axis-label"
                    placeholder="Auto"
                    value={localRange.start ?? ''}
                    onChange={(e) => updateStart(e.target.value)}

                />
                <div className={'h-[1px] w-3 bg-muted-foreground'}/>
                <Input
                    type="number"
                    id="x-axis-label"
                    placeholder="Auto"
                    value={localRange.end ?? ''}
                    onChange={(e) => updateEnd(e.target.value)}
                />
            </div>
        </>
    )
}
