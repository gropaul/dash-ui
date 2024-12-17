import {Exportable} from "@/components/relation/chart/exportable";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {ChartConfig, ChartViewState} from "@/model/relation-view-state/chart";
import {toSnakeCase} from "@/platform/string-utils";
import {WindowSplitter} from "@/components/ui/window-splitter";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";


export interface ChartProps {
    relationId: string;
}

export function Chart(props: ChartProps) {

    const relationState = useRelationsState((state) => state.getRelation(props.relationId), shallow);

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    function updateConfigRatio(ratio: number) {
        updateRelationViewState(props.relationId, {
            chartState: {
                configView: {
                    configPlotRatio: ratio,
                }
            }
        });
    }

    if (relationState.data === undefined) {
        return null;
    }

    const config = relationState.viewState.chartState;

    return (
        <div className="w-full h-full relative overflow-hidden" >
            <WindowSplitter
                ratio={config.configView.configPlotRatio}
                layout={config.configView.layout}
                onChange={updateConfigRatio}
                child2Active={config.configView.showConfig}
            >
                <div className={'p-2 w-full h-full overflow-auto'}>
                    <Exportable fileName={toSnakeCase(config.chart.plot.title ?? 'plot')}>
                        <ChartContent data={relationState.data} config={config.chart} />
                    </Exportable>
                </div>
                <div className={'p-2 w-full h-full overflow-auto'}>
                    <ChartConfigView
                        relationId={props.relationId}
                        config={config}
                        columns={relationState.data.columns}
                    />
                </div>
            </WindowSplitter>
        </div>
    )
}