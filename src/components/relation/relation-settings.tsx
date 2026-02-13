import {TableSettingsContent} from "@/components/relation/table/table-settings-content";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {LayoutDashboard, Settings} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewProps} from "@/components/relation/relation-view";
import {ChartSettingsContent} from "@/components/relation/chart/chart-settings-content";
import {DashboardCommand} from "@/components/workbench/dashboard-command";
import React, {useState} from "react";
import {DashboardCommandState, onAddToDashboardSelected} from "@/components/workbench/editor-overview-tab";
import {useRelationsState} from "@/state/relations.state";


export interface RelationSettingsProps extends RelationViewProps {
    align?: "start" | "center" | "end";
    className?: string;
}

export function RelationSettings(props: RelationSettingsProps) {

    const [dashboardCommand, setDashboardCommand] = useState<DashboardCommandState>({open: false});
    const dashboards = useRelationsState((state) => state.dashboards);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={props.className}>
                    <Settings className="h-4 w-4"/>
                    <span className="sr-only">Open settings</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align={props.align ?? "start"}>
                <RelationSettingsContent {...props}/>

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
        </DropdownMenu>
    );
}

export function RelationSettingsContent(props: RelationSettingsProps) {
    switch (props.relationState.viewState.selectedView) {
        case "table":
            return <TableSettingsContent {...props}/>
        case "chart":
            return <ChartSettingsContent {...props}/>
        default:
            return <></>
    }
}