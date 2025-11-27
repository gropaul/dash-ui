import React from "react";
import {ColumnHeadProps} from "@/components/relation/table/table-head/table-column-head";
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {ChartArea, Check, ChevronRight, Columns3, Copy, EyeOff, Filter} from "lucide-react";

import {AdaptiveEyeOff} from "@/components/relation/common/eye-icon";
import {ContentSelectColumns} from "@/components/relation/table/settings/content-select-columns";
import {RelationViewTableContentProps} from "@/components/relation/table/table-content";
import {RelationViewProps} from "@/components/relation/relation-view";

export interface TableDropDownContentProps extends RelationViewProps {
    columnNames: string[];
}


export function TableDropDownContent(props: TableDropDownContentProps) {


    const tableState = props.relationState.viewState.tableState;
    function onShowStatsChange(visible: boolean) {
        props.updateRelationViewState({
            tableState: {
                ...props.relationState.viewState.tableState,
                showStats: visible
            }
        });
    }

    const numberOfColumns = props.columnNames.length;

    return <>
        <DropdownMenuContent
            side="bottom"
            align="start"
            alignOffset={-1}
            sideOffset={-1}
        >
            <DropdownMenuLabel>
                Table Settings
            </DropdownMenuLabel>
            <DropdownMenuSeparator/>
            <ContentSelectColumns {...props}>
                <Columns3 />
                Show / Hide Columns <ChevronRight className="ml-auto h-4 w-4"/>
            </ContentSelectColumns>
            <DropdownMenuItem>
                <ChartArea />
                <span onClick={() => onShowStatsChange(!tableState.showStats)}>
                    {!tableState.showStats ? "Hide" : "Show"} Statistics
                </span>
            </DropdownMenuItem>

        </DropdownMenuContent>
    </>
}
