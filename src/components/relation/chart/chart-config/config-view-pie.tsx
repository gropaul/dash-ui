import {ChartConfigProps} from "@/components/relation/chart/chart-config-view";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {AxisConfig, getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {Column} from "@/model/column";


export function ConfigViewPie(props: ChartConfigProps) {

    return (
        <>
            <Label><Muted>Data</Muted></Label>
            <ChartColumnSelector {...props} />
        </>
    )
}

export function ChartColumnSelector(props: ChartConfigProps) {

    const columns = props.relationState?.data?.columns ?? ([] as Column[]);
    const relationId = props.relationState.id;
    const config = props.relationState.viewState.chartState;

    function updatePieAxisConfig(axis: Partial<AxisConfig>, key: 'label' | 'radius') {

        console.log('updatePieAxisConfig', axis, key)
        // if not decoraction is set, set default decoration
        if (!axis.decoration) {
            axis.decoration = getInitialAxisDecoration()
        }
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        pie: {
                            axis: {
                                [key]: axis
                            }
                        }
                    }
                }
            }
        })
    }

    return (
        <>
            <ColumnSelector
                plotType={props.relationState.viewState.chartState.chart.plot.type}
                axisType={"pie-label"}
                axis={config.chart.plot.pie.axis.label}
                columns={columns}
                updateAxis={(update) => updatePieAxisConfig(update, 'label')}
            />
            <ColumnSelector
                plotType={props.relationState.viewState.chartState.chart.plot.type}
                axisType={"pie-radius"}
                axis={config.chart.plot.pie.axis.radius}
                columns={columns}
                updateAxis={(update) => updatePieAxisConfig(update, 'radius')}
            />
        </>
    )
}