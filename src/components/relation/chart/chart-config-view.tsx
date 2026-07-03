import {PlotType} from "@/model/relation-view-state/chart";
import {Muted} from "@/components/ui/typography";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ChartTypeSelector} from "@/components/relation/chart/chart-config/chart-type-selector";
import {ConfigViewCartesian} from "@/components/relation/chart/chart-config/config-view-cartesian";
import {ConfigViewPie} from "@/components/relation/chart/chart-config/config-view-pie";
import {RelationState} from "@/model/relation-state";
import {cn} from "@/lib/utils";
import {RelationData} from "@/model/relation";
import {EndUserRelationActions} from "@/state/relations/actions/end-user-actions";
import {ViewManager} from "@/model/relation-state/relation-view";
import {ConfigSection} from "@/components/relation/common/config-section";


export interface ChartConfigProps extends EndUserRelationActions{
    className?: string,
    relationState: RelationState,
    data: RelationData,
    embedded?: boolean,
}

export function ChartConfigView(props: ChartConfigProps) {

    const config = ViewManager.instance.chart.getQueryParameters(props.relationState);

    function updateTitle(title: string) {
        if (!config) return;
        props.updateRelationQueryParams({
            chart: {...config, plot: {...config.plot, title}},
        });
    }

    function updatePlotType(type: PlotType) {
        if (!config) return;
        props.updateRelationQueryParams({
            chart: {...config, plot: {...config.plot, type}},
        });
    }

    return (
        <div className={cn("flex flex-col gap-2", props.className)}>
                        <ConfigSection title={"General"}>
                            <Label className="h-3">
                                <Muted>Title</Muted>
                            </Label>
                            <Input
                                type="text"
                                id="title"
                                placeholder="Title"
                                value={config?.plot?.title}
                                onChange={(e) => updateTitle(e.target.value)}
                            />


                            <Label className="h-3">
                                <Muted>Type</Muted>
                            </Label>
                            <ChartTypeSelector
                                type={config?.plot?.type ?? 'bar'}
                                onPlotTypeChange={updatePlotType}
                            />
                        </ConfigSection>

                        <ChartSpecificConfig {...props} />

                        <div className="h-8" />
        </div>
    );

}


export function ChartSpecificConfig(props: ChartConfigProps) {
    const parameters = ViewManager.instance.chart.getQueryParameters(props.relationState);
    switch (parameters.plot.type) {
        case 'bar':
        case "radar":
        case "line":
        case "scatter":
        case "area":
            return <ConfigViewCartesian {...props}/>;
        case "pie":
            return <ConfigViewPie {...props}/>;
        default:
            return <div> Unsupported plot type: {parameters.plot.type}</div>;
    }

}
