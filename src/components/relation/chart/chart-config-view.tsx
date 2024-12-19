import {AxisConfig, ChartViewState, PlotType} from "@/model/relation-view-state/chart";
import {H5, Muted, Small} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {Column} from "@/model/column";
import {useRelationsState} from "@/state/relations.state";
import {Separator} from "@/components/ui/separator";
import {CirclePlus} from "lucide-react";
import {DEFAULT_COLORS} from "@/platform/global-data";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ChartTypeSelector} from "@/components/relation/chart/chart-config/chart-type-selector";


interface ChartConfigProps {
    relationId: string;
    config: ChartViewState;
    columns: Column[];
}

export function ChartConfigView({relationId, config, columns}: ChartConfigProps) {
    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    function updateTitle(title: string) {
        updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        title: title,
                    },
                },
            },
        });
    }

    function updatePlotType(type: PlotType) {
        updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        type: type,
                    },
                },
            },
        });
    }

    function deleteYAxis(index: number) {
        const yAxes = config.chart.plot.yAxes ?? ([] as Partial<AxisConfig>[]);
        yAxes.splice(index, 1);
        updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        // @ts-ignore
                        yAxes: yAxes,
                    },
                },
            },
        });
    }

    function updateXAxis(axis: Partial<AxisConfig>) {
        updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        // @ts-ignore
                        xAxis: axis
                    }
                }
            }
        });
    }

    function updateYAxis(index: number, update: Partial<AxisConfig>) {
        const yAxes = config.chart.plot.yAxes ?? ([] as Partial<AxisConfig>[]);
        if (yAxes.length <= index) {
            yAxes.push(update);
        } else {
            yAxes[index] = {
                ...yAxes[index],
                ...update,
            };
        }

        updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        // @ts-ignore
                        yAxes: yAxes
                    }
                }
            }
        });
    }

    const noYAxes = !config.chart.plot.yAxes || config.chart.plot.yAxes.length === 0;

    return (
        <div className="relative flex flex-col h-full w-full">
            <H5>Chart Config</H5>
            <div className="flex-1 flex flex-col gap-2 w-full">
                <Separator/>
                <div className="grid w-full items-center gap-1.5 shrink-0">
                    <Label htmlFor="title"><Muted>TITLE</Muted></Label>
                    <Input
                        type="text"
                        id="title"
                        placeholder="Title"
                        value={config.chart.plot.title}
                        onChange={(e) => updateTitle(e.target.value)}
                    />
                </div>
                <Label htmlFor="title"><Muted>TYPE</Muted></Label>
                <ChartTypeSelector
                    type={config.chart.plot.type}
                    onPlotTypeChange={updatePlotType}
                />
                <Label><Muted>DATA</Muted></Label>
                <ColumnSelector
                    axisType={"x"}
                    axis={config.chart.plot.xAxis}
                    columns={columns}
                    updateAxis={(update) => updateXAxis(update)}
                />
                {config.chart.plot.yAxes?.map((yAxis, index) => (
                    <ColumnSelector
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
                        axisType={"y"}
                        columns={columns}
                        updateAxis={(update) =>
                            updateYAxis(0, {
                                color: DEFAULT_COLORS[0],
                                ...update,
                            })
                        }
                    />
                )}

                <button
                    onClick={() =>
                        updateYAxis(config.chart.plot.yAxes!.length, {
                            color:
                                DEFAULT_COLORS[
                                config.chart.plot.yAxes!.length % DEFAULT_COLORS.length
                                    ],
                        })
                    }
                    className="flex items-center gap-2 p-2 shrink-0"
                >
                    <div className="w-4 h-4 mr-1 flex items-center justify-center">
                        <CirclePlus size={16} className="text-gray-500"/>
                    </div>
                    <Small className="text-gray-500">Add Y-Axis</Small>
                </button>

                {/* Fill remaining space */}
                <div className="flex-1 shrink"/>
            </div>
        </div>
    );
}
