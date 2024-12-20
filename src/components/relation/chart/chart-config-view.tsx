import {AxisConfig, ChartViewState, PlotType} from "@/model/relation-view-state/chart";
import {H5, Muted, Small} from "@/components/ui/typography";
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector";
import {Column} from "@/model/column";
import {useRelationsState} from "@/state/relations.state";
import {Separator} from "@/components/ui/separator";
import {CirclePlus} from "lucide-react";
import {DEFAULT_COLORS} from "@/platform/global-data";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ChartTypeSelector} from "@/components/relation/chart/chart-config/chart-type-selector";
import {ConfigViewCartesian} from "@/components/relation/chart/chart-config/config-view-cartesian";
import {ConfigViewPie} from "@/components/relation/chart/chart-config/config-view-pie";


export interface ChartConfigProps {
    relationId: string;
    config: ChartViewState;
    columns: Column[];
}

export function ChartConfigView({relationId, config, columns}: ChartConfigProps) {
    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    function updateTitle(title: string) {
        updateRelationViewState(relationId, {
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
        updateRelationViewState(relationId, {
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
                <ChartSpecificConfig {...{relationId, config, columns}}/>

                {/* Fill remaining space */}
                <div className="flex-1 shrink"/>
            </div>
        </div>
    );
}


export function ChartSpecificConfig(props: ChartConfigProps) {
    const config = props.config.chart.plot;
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