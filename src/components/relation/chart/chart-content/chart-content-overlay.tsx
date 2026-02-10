import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal, DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {
    ChevronDown,
    ChevronRight,
    DownloadIcon,
    LayoutDashboard,
    Settings,
    X
} from "lucide-react";
import {MyChartProps} from "@/components/relation/chart/chart-content";
import {ConfigViewState} from "@/model/relation-view-state/chart";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {cn} from "@/lib/utils";
import React, {useState} from "react";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {DashboardCommand} from "@/components/workbench/dashboard-command";
import {DashboardCommandState, onAddToDashboardSelected} from "@/components/workbench/editor-overview-tab";
import {useRelationsState} from "@/state/relations.state";

export interface ChartContentOverlayProps extends MyChartProps {
    className?: string;
    hasError?: boolean;
    view: ConfigViewState;
    relationId: string;

    updateRelationViewState: (viewState: DeepPartial<RelationViewState>) => void;
    onExportAsSVG?: () => void;
    onExportAsPNG?: () => void;
    updateShowConfig: (show: boolean) => void;
}

export function ChartContentOverlay(props: ChartContentOverlayProps) {

    const [dashboardCommand, setDashboardCommand] = useState<DashboardCommandState>({open: false});
    const dashboards = useRelationsState((state) => state.dashboards);
    const [open, setOpen] = React.useState(false);

    const isMobile = useIsMobile();
    const groupHoverClass = isMobile || open ? '' : 'group-hover:opacity-100 opacity-0';

    const showChartSettings = props.view.showConfig;

    return (
        <>
            <DropdownMenu
                open={open}
                onOpenChange={setOpen}
            >
                <div className={cn(
                    "absolute group right-2 top-2 data-[state=open]:opacity-100",
                    props.className, groupHoverClass)}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Chart options" data-testid="chart-options-menu">
                            <ChevronDown className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent className={"group"} align="end" sideOffset={4}>

                    <DropdownMenuItem
                        onClick={() => props.updateShowConfig(!showChartSettings)}
                    >
                        {showChartSettings ? (
                            <>
                                <X className="mr-1 h-4 w-4"/>
                                Hide Settings
                            </>
                        ) : (
                            <>
                                <Settings className="mr-1 h-4 w-4"/>
                                Show Settings
                            </>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <DownloadIcon className="mr-1 h-4 w-4"/>
                            Export as ...
                            <ChevronRight className="ml-auto h-4 w-4"/>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>

                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={props.onExportAsPNG}>PNG</DropdownMenuItem>
                                <DropdownMenuItem disabled onClick={props.onExportAsSVG}>SVG</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onClick={() => setDashboardCommand({open: true, relation: props.relationState})}>
                        <LayoutDashboard size={16} className="mr-1"/>
                        Add to Dashboard
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <DashboardCommand
                dashboards={Object.values(dashboards)}
                open={dashboardCommand.open}
                setOpen={(open) => setDashboardCommand({...dashboardCommand, open})}
                onDashboardSelected={(d) => onAddToDashboardSelected(dashboardCommand.relation!, d)}
            />
        </>
    );
}
