import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuSwitchItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {EllipsisVertical, LayoutDashboard} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewProps} from "@/components/relation/relation-view";
import {DashboardCommand} from "@/components/workbench/dashboard-command";
import React, {useState} from "react";
import {DashboardCommandState, onAddToDashboardSelected} from "@/components/workbench/editor-overview-tab";
import {useRelationsState} from "@/state/relations.state";

export interface RelationSettingsProps extends RelationViewProps {
    align?: "start" | "center" | "end";
    className?: string;
    children?: React.ReactNode;
}

export function RelationSettings(props: RelationSettingsProps) {

    const [dashboardCommand, setDashboardCommand] = useState<DashboardCommandState>({open: false});
    const dashboards = useRelationsState((state) => state.dashboards);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={props.className}>
                    <EllipsisVertical className="h-4 w-4 mr-2"/>
                    <span className="sr-only">Open settings</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align={props.align ?? "start"}>
                {props.children}
                <DropdownMenuSeparator/>
                <DropdownMenuItem onClick={() => setDashboardCommand({open: true, relation: props.relationState})}>
                    <LayoutDashboard className="h-4 w-4 mr-2"/>
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