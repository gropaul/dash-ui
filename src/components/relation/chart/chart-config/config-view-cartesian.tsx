import {Label} from "@/components/ui/label";
import {H5, Muted, Small} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {CirclePlus} from "lucide-react";
import {AxisConfig, AxisRange, getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {ChartConfigProps} from "@/components/relation/chart/chart-config-view";
import {Column} from "@/model/column";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Switch} from "@/components/ui/switch";
import React from "react";


export function ConfigViewCartesian(props: ChartConfigProps) {

    const config = props.relationState.viewState.chartState;
    const noYAxes = !config.chart.plot.cartesian.yAxes || config.chart.plot.cartesian.yAxes.length === 0;
    const relationId = props.relationState.id;

    function deleteYAxis(index: number) {
        const yAxes = config.chart.plot.cartesian.yAxes ?? ([] as Partial<AxisConfig>[]);
        yAxes.splice(index, 1);
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        cartesian: {
                            // @ts-ignore
                            yAxes: yAxes,
                        }
                    },
                },
            },
        });
    }

    function updateXAxis(axis: Partial<AxisConfig>) {
        props.updateRelationViewState(relationId, {
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
        });
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

    function updateYAxis(index: number, update: Partial<AxisConfig>) {
        const yAxes = config.chart.plot.cartesian.yAxes ?? ([] as Partial<AxisConfig>[]);
        if (yAxes.length <= index) {
            yAxes.push(update);
        } else {
            yAxes[index] = {
                ...yAxes[index],
                ...update,
            };
        }

        props.updateRelationViewState(relationId, {
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
        });
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

    function updateBar(update: {stacked?: boolean}) {
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

    const columns = props.relationState?.data?.columns ?? ([] as Column[]);

    return (
        <>
            <Label className={'h-3'}><Muted>Data</Muted></Label>
            <ColumnSelector
                plotType={config.chart.plot.type}
                axisType={"x"}
                axis={config.chart.plot.cartesian.xAxis}
                columns={columns}
                updateAxis={(update) => updateXAxis(update)}
            />
            {config.chart.plot.cartesian.yAxes?.map((yAxis, index) => (
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

            <button
                onClick={() =>
                    updateYAxis(config.chart.plot.cartesian.yAxes!.length, {
                        decoration: {
                            ...getInitialAxisDecoration(config.chart.plot.cartesian.yAxes!.length),
                        },
                    })
                }
                className="flex items-center gap-2 p-2 shrink-0"
            >
                <div className="w-4 h-4 mr-1 flex items-center justify-center">
                    <CirclePlus size={16} className="text-gray-500"/>
                </div>
                <Small className="text-gray-500">Add Y-Axis</Small>
            </button>

            {config.chart.plot.type !== 'radar' && <>
                <div className={'pb-1'}>
                    <H5>X-Axis</H5>
                    <Separator/>
                </div>
                <Input
                    type="text"
                    id="x-axis-label"
                    placeholder="Label"
                    value={config.chart.plot.cartesian.xLabel}
                    onChange={(e) => updateXLabel(e.target.value)}
                />
                <AxisRangeWidget
                    range={config.chart.plot.cartesian.xRange}
                    updateRange={(range) => updateAxisRange(range, 'xRange')}
                />
                {
                    config.chart.plot.type == 'bar' && <div className={'flex flex-row gap-2 items-center'}>
                        <Muted>Stacked</Muted>
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
                <Input
                    type="text"
                    id="y-axis-label"
                    placeholder="Label"
                    value={config.chart.plot.cartesian.yLabel}
                    onChange={(e) => updateYLabel(e.target.value)}
                />
                <AxisRangeWidget
                    range={config.chart.plot.cartesian.yRange}
                    updateRange={(range) => updateAxisRange(range, 'yRange')}
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