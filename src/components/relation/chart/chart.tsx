import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {toSnakeCase} from "@/platform/string-utils";
import {WindowSplitter} from "@/components/ui/window-splitter";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {CanDisplayPlot} from "@/model/relation-view-state/chart";
import {ChartContentOverlay} from "@/components/relation/chart/chart-content/chart-content-overlay";
import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {useRef} from "react";
import {cn} from "@/lib/utils";
import {RelationViewProps} from "@/components/relation/relation-view";


export function Chart(props: RelationViewProps) {

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

    const isEmbedded = props.embedded ?? false;
    const contentPaddingClass = isEmbedded ? 'p-0' : 'p-2';
    const contentHeightClass = isEmbedded ? 'h-128' : 'h-full';
    const overflowClass = isEmbedded ? 'overflow-hidden' : 'overflow-auto';
    return (
        <div className={cn('w-full relative overflow-hidden', contentHeightClass)}>
            <WindowSplitter
                ratio={config.view.configPlotRatio}
                layout={config.view.layout}
                onChange={updateConfigRatio}
                child2Active={config.view.showConfig}
            >
                <div className={cn('h-full relative', contentPaddingClass, overflowClass)}>
                    {plotDisplayError ?
                        <ChartContentError error={plotDisplayError}/>
                        :
                        <Exportable ref={exportableRef} fileName={toSnakeCase(config.chart.plot.title ?? 'plot')}>
                            <ChartContent
                                hideTitleIfEmpty={props.embedded}
                                data={props.relationState.data}
                                config={config.chart}
                            />
                        </Exportable>
                    }
                    {/* Overlay Button panel so that it is not exportable */}
                    {!isEmbedded && <ChartContentOverlay
                        hasError={plotDisplayError != undefined}
                        data={props.relationState.data}
                        config={config.chart}
                        view={config.view}
                        relationId={relationId}
                        onExportAsSVG={exportableRef.current?.exportChartAsSVG}
                        onExportAsPNG={exportableRef.current?.exportChartAsPNG}
                        updateRelationViewState={props.updateRelationViewState}
                    />}
                </div>
                <div className={'p-2 w-full h-full overflow-y-auto'}>
                    <ChartConfigView
                        embedded={isEmbedded}
                        relationState={props.relationState}
                        updateRelationViewState={props.updateRelationViewState}
                    />
                </div>
            </WindowSplitter>
        </div>
    )
}