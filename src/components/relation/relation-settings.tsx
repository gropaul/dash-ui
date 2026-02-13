import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {TableSettingsContent} from "@/components/relation/table/table-settings-content";
import {DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Settings} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewProps} from "@/components/relation/relation-view";
import {ChartSettingsContent} from "@/components/relation/chart/chart-settings-content";


export interface RelationSettingsProps extends RelationViewProps {
    align?: "start" | "center" | "end";
}

export function RelationSettings(props: RelationSettingsProps) {

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4"/>
                    <span className="sr-only">Open settings</span>
                </Button>
            </DropdownMenuTrigger>
            <RelationSettingsDropDownContent {...props}/>
        </DropdownMenu>
    );
}

function RelationSettingsDropDownContent(props: RelationSettingsProps) {
    switch (props.relationState.viewState.selectedView) {
        case "table":
            return <TableSettingsContent {...props}/>
        case "chart":
            return <ChartSettingsContent {...props}/>
        default:
            return <DropdownMenuContent side="bottom" align={props.align ?? "start"}>
                <DropdownMenuLabel>
                    No settings available for this view
                </DropdownMenuLabel>
            </DropdownMenuContent>
    }
}