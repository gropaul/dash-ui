import {ChartConfigProps} from "@/components/relation/chart/chart-config-view";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {AxisConfig} from "@/model/relation-view-state/chart";
import {useRelationsState} from "@/state/relations.state";


export function ConfigViewPie(props: ChartConfigProps) {

    return (
        <>
            <Label><Muted>Data</Muted></Label>
            <ChartColumnSelector {...props} />
        </>
    )
}

export function ChartColumnSelector(props: ChartConfigProps) {

    const {config, columns, relationId} = props;

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);


    function updatePieAxisConfig(axis: Partial<AxisConfig>, key: 'label' | 'radius') {
        updateRelationViewState(relationId, {
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
                axisType={"pie-label"}
                axis={config.chart.plot.pie.axis.label}
                columns={columns}
                updateAxis={(update) => updatePieAxisConfig(update, 'label')}
            />
            <ColumnSelector
                axisType={"pie-radius"}
                axis={config.chart.plot.pie.axis.radius}
                columns={columns}
                updateAxis={(update) => updatePieAxisConfig(update, 'radius')}
            />
        </>
    )
}