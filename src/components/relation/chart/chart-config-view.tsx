import {PlotType} from "@/model/relation-view-state/chart";
import {H5, Muted} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ChartTypeSelector} from "@/components/relation/chart/chart-config/chart-type-selector";
import {ConfigViewCartesian} from "@/components/relation/chart/chart-config/config-view-cartesian";
import {ConfigViewPie} from "@/components/relation/chart/chart-config/config-view-pie";
import {RelationState, ViewQueryParameters} from "@/model/relation-state";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {cn} from "@/lib/utils";
import {RelationData} from "@/model/relation";
import {ScrollArea} from "@/components/ui/scroll-area";


export interface ChartConfigProps {
    className?: string,
    relationState: RelationState,
    data: RelationData,
    embedded?: boolean,
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
    updateRelationDataWithParams: (relationId: string, query: ViewQueryParameters) => Promise<void>,

}

export function ChartConfigView(props: ChartConfigProps) {

    const relationId = props.relationState.id;
    const config = props.relationState.viewState.chartState;

    function updateTitle(title: string) {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        title: title,
                    },
                },
            },
        });
    }

    function updatePlotType(type: PlotType) {
        props.updateRelationViewState(relationId, {
            chartState: {
                chart: {
                    plot: {
                        type: type,
                    },
                },
            },
        });
    }

    return (
        <div
            className={cn(
                // make this section take the available height and allow children to shrink
                "relative flex h-full min-h-0 flex-col gap-2 overflow-hidden",
                props.className
            )}
        >
            <div className="pb-1 shrink-0 mr-3">
                <H5>Data Config</H5>
                <Separator />
            </div>

            {/* Wrapper to ensure the ScrollArea can actually shrink */}
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full w-full pr-3">
                    <div className="flex min-h-full flex-col gap-2 p-0.5 ">
                        <Label className="h-3">
                            <Muted>Title</Muted>
                        </Label>
                        <Input
                            type="text"
                            id="title"
                            placeholder="Title"
                            value={config.chart.plot.title}
                            onChange={(e) => updateTitle(e.target.value)}
                        />


                        <Label className="h-3">
                            <Muted>Type</Muted>
                        </Label>
                        <ChartTypeSelector
                            type={config.chart.plot.type}
                            onPlotTypeChange={updatePlotType}
                        />

                        <ChartSpecificConfig {...props} />

                        <div className="h-8" />
                        <div className="flex-1 shrink"/>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );

}


export function ChartSpecificConfig(props: ChartConfigProps) {
    const config = props.relationState.viewState.chartState.chart.plot;
    switch (config.type) {
        case 'bar':
        case "radar":
        case "line":
        case "scatter":
        case "area":
            return <ConfigViewCartesian {...props}/>;
        case "pie":
            return <ConfigViewPie {...props}/>;
        default:
            throw new Error(`Unsupported plot type: ${config.type}`);
    }

}