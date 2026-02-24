import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {toSnakeCase} from "@/platform/string-utils";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {CanDisplayPlot, tryInferChartConfig} from "@/model/relation-view-state/chart";
import {useEffect, useRef} from "react";
import {useRelationContext} from "@/components/relation/chart/chart-export-context";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";

export interface ChartContentWrapperProps extends RelationViewContentProps {
    showOverlay?: boolean;
}

export function ChartContentWrapper(props: ChartContentWrapperProps) {
    const exportableRef = useRef<ExportableRef>(null);
    const chartExport = useRelationContext();
    const data = props.data;

    const originalConfig = props.relationState.viewState.chartState;

    // Check if original config has an error
    const originalError = CanDisplayPlot(originalConfig.chart, data);

    // Only try to infer if original has an error
    let effectiveChartState = originalConfig;
    let effectiveRelationState = props.relationState;

    if (originalError) {
        const inferredChart = tryInferChartConfig(originalConfig.chart, data);
        if (inferredChart) {
            const inferredChartState = {...originalConfig, chart: inferredChart};
            const inferredError = CanDisplayPlot(inferredChart, data);
            // Only use inferred if it has no error
            if (!inferredError) {
                effectiveChartState = inferredChartState;
                effectiveRelationState = {
                    ...props.relationState,
                    viewState: {...props.relationState.viewState, chartState: effectiveChartState}
                };
            }
        }
    }

    const plotDisplayError = CanDisplayPlot(effectiveChartState.chart, data);

    // Register ref with context
    useEffect(() => {
        chartExport?.setExportableChartRef(exportableRef);
        console.log('setting chart export to', exportableRef);
        return () => chartExport?.setExportableChartRef(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isEmbedded = props.embedded ?? false;
    const showOverlay = props.showOverlay ?? true;

    const showChartSettings = props.relationState.viewState.chartState.view.showConfig;

    function updateShowConfig() {
        props.updateRelationViewState({
            chartState: {
                view: {
                    showConfig: !showChartSettings,
                },
            },
        });
    }

    return (
        <>
            {plotDisplayError ?
                <ChartContentError
                    error={plotDisplayError}
                    updateShowConfig={updateShowConfig}
                    showChartSettings={showChartSettings}
                />
                :
                <Exportable ref={exportableRef} fileName={toSnakeCase(effectiveChartState.chart.plot.title ?? 'plot')}>
                    <ChartContent
                        embedded={props.embedded}
                        hideTitleIfEmpty={props.embedded}
                        data={data}
                        relationState={effectiveRelationState}
                    />
                </Exportable>
            }
        </>
    )
}