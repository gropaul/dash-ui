import {Label} from "@/components/ui/label";
import {Muted, Small} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {DEFAULT_COLORS} from "@/platform/global-data";
import {CirclePlus} from "lucide-react";
import {AxisConfig} from "@/model/relation-view-state/chart";
import {ChartConfigProps} from "@/components/relation/chart/chart-config-view";
import {Column} from "@/model/column";


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

    const columns = props.relationState?.data?.columns ?? ([] as Column[]);

    return (
        <>
            <Label><Muted>Data</Muted></Label>
            <ColumnSelector
                axisType={"x"}
                axis={config.chart.plot.cartesian.xAxis}
                columns={columns}
                updateAxis={(update) => updateXAxis(update)}
            />
            {config.chart.plot.cartesian.yAxes?.map((yAxis, index) => (
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
                    updateYAxis(config.chart.plot.cartesian.yAxes!.length, {
                        color:
                            DEFAULT_COLORS[
                            config.chart.plot.cartesian.yAxes!.length % DEFAULT_COLORS.length
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
        </>
    )
}