import {Label} from "@/components/ui/label";
import {H5, Muted, Small} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {CirclePlus, Lock} from "lucide-react";
import {AxisConfig, AxisRange, getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {ChartConfigProps} from "@/components/relation/chart/chart-config-view";

import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Switch} from "@/components/ui/switch";
import React from "react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {plotUsesGroup} from "@/components/relation/chart/echart-utils";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Column} from "@/model/data-source-connection";


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

        props.updateRelationViewState(newState);
    }

    function updateAxisRange(range: AxisRange, axis: 'xRange' | 'yRange') {
        props.updateRelationViewState({
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
        props.updateRelationViewState(newState);
    }

    function updateXLabel(label: string) {
        props.updateRelationViewState({
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
        props.updateRelationViewState({
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
        props.updateRelationViewState({
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

    function updateXAxisType(type: string | undefined) {
        props.updateRelationViewState({
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            xAxisType: type as any,
                        }
                    }
                }
            }
        });
    }

    function updateYTickAngle(angle: string) {
        props.updateRelationViewState({
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
        props.updateRelationViewState({
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

    function arraysEqual(a?: string[], b?: string[]): boolean {
        if (a === b) return true; // covers both null and same reference
        if (!a || !b) return false; // one is null, the other not
        if (a.length !== b.length) return false;
        return a.every((v, i) => v === b[i]);
    }


    async function updateDataForGroupBy(update: DeepPartial<RelationViewState>) {

        const oldXAxs = props.relationState.query.viewParameters.chart.xAxis;
        const oldYAxisIds = props.relationState.query.viewParameters.chart.yAxes;
        const oldGroupBy = props.relationState.query.viewParameters.chart.groupBy

        const copy = deepClone(update);
        const updated = safeDeepUpdate( props.relationState.viewState, copy);

        const newXAxis = updated.chartState?.chart?.plot?.cartesian?.xAxis?.columnId;
        const newYAxes = updated.chartState?.chart?.plot?.cartesian?.yAxes?.map((x) => x.columnId);
        const newGroupBy = updated.chartState?.chart?.plot?.cartesian?.groupBy?.columnId;

        console.log('There are some errors here')
        const xAxisChanged = newXAxis !== oldXAxs;
        const yAxisChanged = !arraysEqual(newYAxes, oldYAxisIds);
        const groupByChanged = newGroupBy !== oldGroupBy;

        // Only update if the groupById is different and all data is ready
        if ((xAxisChanged || yAxisChanged || groupByChanged) && newXAxis && newYAxes ) {
            await props.updateRelationDataWithParams({
                ...props.relationState.query.viewParameters,
                chart: {
                    xAxis: newXAxis,
                    yAxes: [newYAxes[0]],
                    groupBy: newGroupBy,
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

        props.updateRelationViewState(newState);
        await updateDataForGroupBy(newState);


    }

    const columns = props.relationState?.viewState.schema ?? ([] as Column[]);

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
                    decorationMenu={!plotUsesGroup(config.chart.plot)}
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
                    decorationMenu={true}
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
                <Label className={'h-3'}><Muted>Axis Type</Muted></Label>
                <Select
                    value={config.chart.plot.cartesian?.xAxisType ?? 'auto'}
                    onValueChange={(value) => updateXAxisType(value === 'auto' ? undefined : value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="value">Numeric</SelectItem>
                    </SelectContent>
                </Select>
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
