import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {toSnakeCase} from "@/platform/string-utils";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {CanDisplayPlot} from "@/model/relation-view-state/chart";
import {RelationViewProps} from "@/components/relation/relation-view";
import {useRef} from "react";
import {ChartContentOverlay} from "@/components/relation/chart/chart-content/chart-content-overlay";
import {useRelationData} from "@/state/relations-data.state";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {useIsMobile} from "@/hooks/use-is-mobile";
import {cn} from "@/lib/utils";

export interface ChartContentWrapperProps extends RelationViewContentProps {
    showOverlay?: boolean;
}

export function ChartContentWrapper(props: ChartContentWrapperProps) {
    const exportableRef = useRef<ExportableRef>(null);
    const data = props.data;

    const config = props.relationState.viewState.chartState;
    const plotDisplayError = CanDisplayPlot(config.chart, data);

    const isEmbedded = props.embedded ?? false;
    const showOverlay = props.showOverlay ?? true;

    const isMobile = useIsMobile();

    const groupHoverClass = isMobile ? '' : 'group-hover:opacity-100 opacity-0';

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
                className={cn(isEmbedded ? 'top-0 right-2 transition-opacity duration-200' : '', groupHoverClass)}
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