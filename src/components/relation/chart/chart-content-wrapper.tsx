import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {toSnakeCase} from "@/platform/string-utils";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {CanDisplayPlot} from "@/model/relation-view-state/chart";
import {RelationViewProps} from "@/components/relation/relation-view";
import {useRef} from "react";
import {ChartContentOverlay} from "@/components/relation/chart/chart-content/chart-content-overlay";

export interface ChartContentWrapperProps extends RelationViewProps {
    showOverlay?: boolean;
}

export function ChartContentWrapper(props: ChartContentWrapperProps) {
    const exportableRef = useRef<ExportableRef>(null);

    const config = props.relationState.viewState.chartState;
    const data = props.relationState.data!;
    const plotDisplayError = CanDisplayPlot(config.chart, data);

    const isEmbedded = props.embedded ?? false;
    const showOverlay = props.showOverlay ?? true;

    return (
        <>
            {plotDisplayError ?
                <ChartContentError error={plotDisplayError}/>
                :
                <Exportable ref={exportableRef} fileName={toSnakeCase(config.chart.plot.title ?? 'plot')}>
                    <ChartContent
                        embedded={props.embedded}
                        hideTitleIfEmpty={props.embedded}
                        data={data}
                        config={config.chart}
                    />
                </Exportable>
            }
            {/* Overlay Button panel so that it is not exportable */}
            {showOverlay && <ChartContentOverlay
                embedded={props.embedded}
                className={isEmbedded ? ' top-0 right-2 group-hover:opacity-100 opacity-0 transition-opacity duration-200' : ''}
                hasError={plotDisplayError != undefined}
                data={data}
                config={config.chart}
                view={config.view}
                relationId={props.relationState.id}
                onExportAsSVG={exportableRef.current?.exportChartAsSVG}
                onExportAsPNG={exportableRef.current?.exportChartAsPNG}
                updateRelationViewState={props.updateRelationViewState}
            />}
        </>
    )
}