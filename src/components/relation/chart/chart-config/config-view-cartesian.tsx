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
import {deepClone} from "@/platform/object-utils";
import {plotUsesGroup} from "@/components/relation/chart/echart-utils";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Column} from "@/model/data-source-connection";
import {ViewManager} from "@/model/relation-state/relation-view";


export function ConfigViewCartesian(props: ChartConfigProps) {

    const chart = ViewManager.instance.chart.getQueryParameters(props.relationState);
    const cartesian = chart.plot.cartesian;
    const noYAxes = !cartesian.yAxes || cartesian.yAxes.length === 0;

    function deleteYAxis(index: number) {
        updateYAxis(index, undefined);
    }

    // Axis changes require a re-query because they change the SQL SELECT columns
    async function updateXAxis(axis: Partial<AxisConfig> | undefined) {
        await props.updateRelationDataWithParams({
            ...props.relationState.query.viewParameters,
            chart: {
                ...chart,
                plot: {...chart.plot, cartesian: {...cartesian, xAxis: axis as AxisConfig | undefined}},
            },
        });
    }

    async function updateYAxis(index: number, update: Partial<AxisConfig> | undefined) {
        const yAxes = deepClone(cartesian.yAxes ?? [] as AxisConfig[]);
        if (update === undefined) {
            if (index < yAxes.length) yAxes.splice(index, 1);
        } else if (yAxes.length <= index) {
            yAxes.push(update as AxisConfig);
        } else {
            yAxes[index] = {...yAxes[index], ...update};
        }
        await props.updateRelationDataWithParams({
            ...props.relationState.query.viewParameters,
            chart: {
                ...chart,
                plot: {...chart.plot, cartesian: {...cartesian, yAxes}},
            },
        });
    }

    async function updateGroupAxis(update: Partial<AxisConfig> | undefined) {
        await props.updateRelationDataWithParams({
            ...props.relationState.query.viewParameters,
            chart: {
                ...chart,
                plot: {...chart.plot, cartesian: {...cartesian, groupBy: update as AxisConfig | undefined}},
            },
        });
    }

    // Decoration / display changes do NOT need a re-query
    function updateCartesian(patch: Partial<typeof cartesian>) {
        props.updateRelationQueryParams({
            chart: {...chart, plot: {...chart.plot, cartesian: {...cartesian, ...patch}}},
        });
    }

    function updateAxisRange(range: AxisRange, axis: 'xRange' | 'yRange') {
        updateCartesian({[axis]: range});
    }

    function updateXLabel(label: string) {
        updateCartesian({xLabel: label});
    }

    function updateYLabel(label: string) {
        updateCartesian({yLabel: label});
    }

    function updateXTickAngle(angle: string) {
        updateCartesian({xLabelRotation: parseString(angle)});
    }

    function updateXAxisType(type: string | undefined) {
        updateCartesian({xAxisType: type as any});
    }

    function updateYTickAngle(angle: string) {
        updateCartesian({yLabelRotation: parseString(angle)});
    }

    function updateBar(update: { stacked: boolean }) {
        updateCartesian({decoration: {...cartesian.decoration, bar: {...cartesian.decoration.bar, stacked: update.stacked}}});
    }

    const columns = props.relationState?.viewState.schema ?? ([] as Column[]);
    const yAxis = cartesian.yAxes;
    const showStackedBars = chart.plot.type == 'bar' && (yAxis?.length ?? 0) > 1;
    const showGroupBy = chart.plot.type !== 'radar' && (yAxis == undefined || yAxis?.length == 0 || yAxis?.length === 1);
    const disableAddYAxis = cartesian.groupBy !== undefined;

    return (
        <>
            <Label className={'h-3'}><Muted>Data</Muted></Label>
            <ColumnSelector
                plotType={chart.plot.type}
                axisType={"x"}
                axis={cartesian.xAxis}
                columns={columns}
                deleteAxis={() => updateXAxis(undefined)}
                updateAxis={(update) => updateXAxis(update)}
            />
            {yAxis?.map((yAxis, index) => (
                <ColumnSelector
                    decorationMenu={!plotUsesGroup(chart.plot)}
                    plotType={chart.plot.type}
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
                    plotType={chart.plot.type}
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
                                updateYAxis(cartesian.yAxes!.length, {
                                    decoration: getInitialAxisDecoration(cartesian.yAxes!.length),
                                })
                            }
                        >
                            <div className="w-4 h-4 mr-1 flex items-center justify-center">
                                {disableAddYAxis
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
            {showGroupBy && (
                <ColumnSelector
                    plotType={chart.plot.type}
                    axisType={"group"}
                    axis={cartesian.groupBy}
                    columns={columns}
                    deleteAxis={() => updateGroupAxis(undefined)}
                    updateAxis={(update) => updateGroupAxis(update)}
                />
            )}
            {chart.plot.type !== 'radar' && <>
                <div className={'pb-1'}>
                    <H5>X-Axis</H5>
                    <Separator/>
                </div>
                <Label className={'h-3'}><Muted>Label</Muted></Label>
                <Input
                    type="text"
                    id="x-axis-label"
                    placeholder="None"
                    value={cartesian.xLabel}
                    onChange={(e) => updateXLabel(e.target.value)}
                />
                <AxisRangeWidget
                    range={cartesian.xRange}
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
                    value={cartesian.xLabelRotation ?? ''}
                    onChange={(e) => updateXTickAngle(e.target.value)}
                />
                <Label className={'h-3'}><Muted>Axis Type</Muted></Label>
                <Select
                    value={cartesian.xAxisType ?? 'auto'}
                    onValueChange={(value) => updateXAxisType(value === 'auto' ? undefined : value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Auto"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="value">Numeric</SelectItem>
                    </SelectContent>
                </Select>
                {showStackedBars && (
                    <div className={'flex flex-row gap-2 items-center'}>
                        <Muted>Stacked Bars</Muted>
                        <Switch
                            checked={cartesian.decoration?.bar?.stacked}
                            onCheckedChange={(checked) => updateBar({stacked: checked})}
                        />
                    </div>
                )}
                <div className={'pb-1'}>
                    <H5>Y-Axis</H5>
                    <Separator/>
                </div>
                <Label className={'h-3'}><Muted>Label</Muted></Label>
                <Input
                    type="text"
                    id="y-axis-label"
                    placeholder="None"
                    value={cartesian.yLabel}
                    onChange={(e) => updateYLabel(e.target.value)}
                />
                <AxisRangeWidget
                    range={cartesian.yRange}
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
                    value={cartesian.yLabelRotation ?? ''}
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
        props.updateRange({...props.range, start: parseString(start)});
    }

    function updateEnd(end: string) {
        props.updateRange({...props.range, end: parseString(end)});
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
