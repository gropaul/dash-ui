import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {toSnakeCase} from "@/platform/string-utils";
import {WindowSplitter} from "@/components/ui/window-splitter";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {CanDisplayPlot} from "@/model/relation-view-state/chart";
import {ChartContentOverlay} from "@/components/relation/chart/chart-content/chart-content-overlay";
import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {useRef} from "react";
import {RelationState} from "@/model/relation-state";
import {DeepPartial} from "@/platform/utils";
import {RelationViewState} from "@/model/relation-view-state";


export interface ChartProps {
    relationState: RelationState
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
}

export function Chart(props: ChartProps) {

    const exportableRef = useRef<ExportableRef>(null);
    const relationId = props.relationState.id;

    function updateConfigRatio(ratio: number) {
        props.updateRelationViewState(relationId, {
            chartState: {
                view: {
                    configPlotRatio: ratio,
                }
            }
        });
    }

    if (props.relationState.data === undefined) {
        return null;
    }

    const config = props.relationState.viewState.chartState;
    const plotDisplayError = CanDisplayPlot(config.chart, props.relationState.data);
    return (
        <div className="w-full h-full relative overflow-hidden">
            <WindowSplitter
                ratio={config.view.configPlotRatio}
                layout={config.view.layout}
                onChange={updateConfigRatio}
                child2Active={config.view.showConfig}
            >
                <div className={'w-full p-2 h-full overflow-auto relative'}>
                    {plotDisplayError ?
                        <ChartContentError error={plotDisplayError}/>
                        :
                        <Exportable ref={exportableRef} fileName={toSnakeCase(config.chart.plot.title ?? 'plot')}>
                            <ChartContent data={props.relationState.data} config={config.chart}/>
                        </Exportable>
                    }
                    {/* Overlay Button panel so that it is not exportable */}
                    <ChartContentOverlay
                        hasError={plotDisplayError != undefined}
                        data={props.relationState.data}
                        config={config.chart}
                        view={config.view}
                        relationId={relationId}
                        onExportAsSVG={exportableRef.current?.exportChartAsSVG}
                        onExportAsPNG={exportableRef.current?.exportChartAsPNG}
                        updateRelationViewState={props.updateRelationViewState}
                    />
                </div>
                <div className={'p-2 w-full h-full overflow-y-auto'}>
                    <ChartConfigView
                        relationState={props.relationState}
                        updateRelationViewState={props.updateRelationViewState}
                    />
                </div>
            </WindowSplitter>
        </div>
    )
}