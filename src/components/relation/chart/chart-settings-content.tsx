import React, {useState} from "react";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {Download, LayoutDashboard, Settings, X} from "lucide-react";

import {RelationSettingsProps} from "@/components/relation/relation-settings";
import {DashboardCommand} from "@/components/workbench/dashboard-command";
import {useRelationsState} from "@/state/relations.state";
import {DashboardCommandState, onAddToDashboardSelected} from "@/components/workbench/editor-overview-tab";
import {useChartExport} from "@/components/relation/chart/chart-export-context";

export function ChartSettingsContent(props: RelationSettingsProps) {

    const [dashboardCommand, setDashboardCommand] = useState<DashboardCommandState>({open: false});
    const dashboards = useRelationsState((state) => state.dashboards);
    const chartExport = useChartExport();

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

    return <>
        <DropdownMenuContent
            side="bottom"
            align={props.align ?? "start"}
        >
            <DropdownMenuLabel>
                Chart Settings
            </DropdownMenuLabel>
            <DropdownMenuSeparator/>

            <DropdownMenuItem
                onClick={() => updateShowConfig()}
            >
                {showChartSettings ? (
                    <>
                        <X className="mr-1 h-4 w-4"/> Hide Settings
                    </>
                ) : (
                    <>
                        <Settings className="mr-1 h-4 w-4"/> Show Settings
                    </>
                )}
            </DropdownMenuItem>

            <DropdownMenuSeparator/>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!chartExport?.exportableRef?.current}>
                    <Download className="mr-1 h-4 w-4"/> Export chart as ...
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    <DropdownMenuItem
                        onClick={() => chartExport?.exportableRef?.current?.exportChartAsPNG?.()}
                    >
                        PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => chartExport?.exportableRef?.current?.exportChartAsSVG?.()}
                    >
                        SVG
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator/>
            <DropdownMenuItem onClick={() => setDashboardCommand({open: true, relation: props.relationState})}>
                <LayoutDashboard size={16} className="mr-1"/>
                Add to Dashboard
            </DropdownMenuItem>
        </DropdownMenuContent>
        <DashboardCommand
            dashboards={Object.values(dashboards)}
            open={dashboardCommand.open}
            setOpen={(open) => setDashboardCommand({...dashboardCommand, open})}
            onDashboardSelected={(d) => onAddToDashboardSelected(dashboardCommand.relation!, d)}
        />
    </>
}
