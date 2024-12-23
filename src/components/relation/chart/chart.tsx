import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {toSnakeCase} from "@/platform/string-utils";
import {WindowSplitter} from "@/components/ui/window-splitter";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Download} from "lucide-react";
import {CanDisplayPlot} from "@/model/relation-view-state/chart";
import {ChartContentOverlay} from "@/components/relation/chart/chart-content/chart-content-overlay";
import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {useRef} from "react";


export interface ChartProps {
    relationId: string;
}

export function Chart(props: ChartProps) {

    const relationState = useRelationsState((state) => state.getRelation(props.relationId), shallow);
    const exportableRef = useRef<ExportableRef>(null);

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    function updateConfigRatio(ratio: number) {
        updateRelationViewState(props.relationId, {
            chartState: {
                view: {
                    configPlotRatio: ratio,
                }
            }
        });
    }

    if (relationState.data === undefined) {
        return null;
    }

    const config = relationState.viewState.chartState;
    const plotDisplayError = CanDisplayPlot(config.chart, relationState.data);
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
                            <ChartContent data={relationState.data} config={config.chart}/>
                        </Exportable>
                    }
                    {/* Overlay Button panel so that it is not exportable */}
                    <ChartContentOverlay
                        hasError={plotDisplayError != undefined}
                        data={relationState.data}
                        config={config.chart}
                        view={config.view}
                        relationId={props.relationId}
                        onExportAsSVG={exportableRef.current?.exportChartAsSVG}
                        onExportAsPNG={exportableRef.current?.exportChartAsPNG}
                    />
                </div>
                <div className={'p-2 w-full h-full overflow-y-auto'}>
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