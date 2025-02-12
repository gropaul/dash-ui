import {PlotType} from "@/model/relation-view-state/chart";
import {H5, Muted} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ChartTypeSelector} from "@/components/relation/chart/chart-config/chart-type-selector";
import {ConfigViewCartesian} from "@/components/relation/chart/chart-config/config-view-cartesian";
import {ConfigViewPie} from "@/components/relation/chart/chart-config/config-view-pie";
import {RelationState} from "@/model/relation-state";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {cn} from "@/lib/utils";


export interface ChartConfigProps {
    className?: string,
    relationState: RelationState,
    embedded?: boolean,
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
}

export function ChartConfigView(props: ChartConfigProps) {

    const relationId = props.relationState.id;
    const config = props.relationState.viewState.chartState;

    const embedded = props.embedded ?? false;

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
        <div className={cn("relative flex flex-col h-full w-full", props.className)}>
            <div className={'pb-1'}>
                <H5>Data Config</H5>
                <Separator/>
            </div>
            <div className="flex-1 flex flex-col gap-2 w-full">

                <div className="grid w-full items-center gap-1.5 shrink-0">
                    <Label className={'h-3'}><Muted>Title</Muted></Label>
                    <Input
                        type="text"
                        id="title"
                        placeholder="Title"
                        value={config.chart.plot.title}
                        onChange={(e) => updateTitle(e.target.value)}
                    />
                </div>
                <Label className={'h-3'}><Muted>Type</Muted></Label>
                <ChartTypeSelector
                    type={config.chart.plot.type}
                    onPlotTypeChange={updatePlotType}
                />
                <ChartSpecificConfig {...props}/>

                {/* Fill remaining space */}
                <div className="h-8"/>
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