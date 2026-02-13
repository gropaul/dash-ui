import {ChartContentError} from "@/components/relation/chart/chart-content/chart-content-error";
import {Exportable, ExportableRef} from "@/components/relation/chart/exportable";
import {toSnakeCase} from "@/platform/string-utils";
import {ChartContent} from "@/components/relation/chart/chart-content";
import {CanDisplayPlot} from "@/model/relation-view-state/chart";
import {useEffect, useRef} from "react";
import {useChartExport} from "@/components/relation/chart/chart-export-context";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";

export interface ChartContentWrapperProps extends RelationViewContentProps {
    showOverlay?: boolean;
}

export function ChartContentWrapper(props: ChartContentWrapperProps) {
    const exportableRef = useRef<ExportableRef>(null);
    const chartExport = useChartExport();
    const data = props.data;

    const config = props.relationState.viewState.chartState;
    const plotDisplayError = CanDisplayPlot(config.chart, data);

    // Register ref with context
    useEffect(() => {
        chartExport?.setExportableRef(exportableRef);
        return () => chartExport?.setExportableRef(null);
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
                <Exportable ref={exportableRef} fileName={toSnakeCase(config.chart.plot.title ?? 'plot')}>
                    <ChartContent
                        embedded={props.embedded}
                        hideTitleIfEmpty={props.embedded}
                        data={data}
                        relationState={props.relationState}
                    />
                </Exportable>
            }
        </>
    )
}