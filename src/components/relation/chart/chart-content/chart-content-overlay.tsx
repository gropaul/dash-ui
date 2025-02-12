import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {ImageDown, Pencil, PencilOff} from "lucide-react";
import {MyChartProps} from "@/components/relation/chart/chart-content";
import {ConfigViewState} from "@/model/relation-view-state/chart";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {cn} from "@/lib/utils";

export interface ChartContentOverlayProps extends MyChartProps {
    className?: string;
    hasError?: boolean;
    view: ConfigViewState;
    relationId: string;

    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void;
    onExportAsSVG?: () => void;
    onExportAsPNG?: () => void;
}

export function ChartContentOverlay(props: ChartContentOverlayProps) {
    const showChartSettings = props.view.showConfig;

    function updateShowConfig() {
        props.updateRelationViewState(props.relationId, {
            chartState: {
                view: {
                    showConfig: !showChartSettings,
                },
            },
        });
    }

    return (
        <div className={cn("absolute right-2 top-2 flex gap-2", props.className)}>
            {/* Toggle Chart Settings Button */}
            <Button variant="ghost" size="icon" onClick={updateShowConfig}>
                {showChartSettings ? <PencilOff size={16} /> : <Pencil size={16} />}
            </Button>

            {/* Export Chart Dropdown Button */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <ImageDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={props.onExportAsPNG}>Export as PNG</DropdownMenuItem>
                    <DropdownMenuItem disabled onClick={props.onExportAsSVG}>Export as SVG</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
