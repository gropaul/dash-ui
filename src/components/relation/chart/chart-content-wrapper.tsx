import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {toSnakeCase} from "@/platform/string-utils";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {CanDisplayPlot, tryInferChartConfig} from "@/model/relation-view-state/chart";
import {useEffect, useRef} from "react";
import {useRelationContext} from "@/components/relation/chart/chart-export-context";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {ChartQueryParameters} from "@/model/relation-state/relation-view-chart";
import {ViewManager} from "@/model/relation-state/relation-view";

export interface ChartContentWrapperProps extends RelationViewContentProps {
    showOverlay?: boolean;
}

export function ChartContentWrapper(props: ChartContentWrapperProps) {
    const exportableRef = useRef<ExportableRef>(null);
    const chartExport = useRelationContext();
    const data = props.data;

    const originalConfig = ViewManager.instance.chart.getQueryParameters(props.relationState);

    // Check if original config has an error
    const originalError = originalConfig ? CanDisplayPlot(originalConfig, data) : {
        type: 'config-not-complete' as const,
        message: 'No chart configuration'
    };

    // Only try to infer if original has an error
    let effectiveConfig = originalConfig;
    let effectiveRelationState = props.relationState;

    if (originalError && originalConfig) {
        const inferredChart = tryInferChartConfig(originalConfig, data);
        if (inferredChart) {
            const inferredConfig: ChartQueryParameters = {...originalConfig, plot: inferredChart.plot};
            const inferredError = CanDisplayPlot(inferredConfig, data);
            // Only use inferred if it has no error
            if (!inferredError) {
                effectiveConfig = inferredConfig;
                effectiveRelationState = {
                    ...props.relationState,
                    query: {
                        ...props.relationState.query,
                        viewParameters: {
                            ...props.relationState.query.viewParameters,
                            chart: effectiveConfig,
                        }
                    }
                };
            }
        }
    }

    const plotDisplayError = effectiveConfig ? CanDisplayPlot(effectiveConfig, data) : originalError;

    // Register ref with context
    useEffect(() => {
        chartExport?.setExportableChartRef(exportableRef);
        return () => chartExport?.setExportableChartRef(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showChartSettings = props.getSessionState(props.mode).configState.showConfig;

    function updateShowConfig() {
        props.updateSessionState(props.mode, {configState: {showConfig: !showChartSettings}});
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
                <Exportable ref={exportableRef} fileName={toSnakeCase(effectiveConfig?.plot?.title ?? 'plot')}>
                    <ChartContent
                        {...props}
                        hideTitleIfEmpty={props.embedded}
                        data={data}
                        relationState={effectiveRelationState}
                    />
                </Exportable>
            }
        </>
    )
}
