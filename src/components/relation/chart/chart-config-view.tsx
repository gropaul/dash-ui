import {PlotType} from "@/model/relation-view-state/chart";
import {H5, Muted} from "@/components/ui/typography";
import {Column} from "@/model/column";
import {Separator} from "@/components/ui/separator";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ChartTypeSelector} from "@/components/relation/chart/chart-config/chart-type-selector";
import {ConfigViewCartesian} from "@/components/relation/chart/chart-config/config-view-cartesian";
import {ConfigViewPie} from "@/components/relation/chart/chart-config/config-view-pie";
import {RelationState} from "@/model/relation-state";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";


export interface ChartConfigProps {
    relationState: RelationState
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
}

export function ChartConfigView(props: ChartConfigProps) {

    const columns = props.relationState?.data?.columns ?? ([] as Column[]);
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
        <div className="relative flex flex-col h-full w-full">
            <H5>Chart Config</H5>
            <div className="flex-1 flex flex-col gap-2 w-full">
                <Separator/>
                <div className="grid w-full items-center gap-1.5 shrink-0">
                    <Label htmlFor="title"><Muted>Title</Muted></Label>
                    <Input
                        type="text"
                        id="title"
                        placeholder="Title"
                        value={config.chart.plot.title}
                        onChange={(e) => updateTitle(e.target.value)}
                    />
                </div>
                <Label htmlFor="title"><Muted>Type</Muted></Label>
                <ChartTypeSelector
                    type={config.chart.plot.type}
                    onPlotTypeChange={updatePlotType}
                />
                <ChartSpecificConfig {...props}/>

                {/* Fill remaining space */}
                <div className="flex-1 shrink"/>
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