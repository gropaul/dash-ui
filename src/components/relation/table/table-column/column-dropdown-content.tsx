import React from "react";
import {ColumnHeadProps} from "@/components/relation/table/table-head/table-column-head";
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {Check, Copy, EyeOff, Filter} from "lucide-react";

import {AdaptiveEyeOff} from "@/components/relation/common/eye-icon";
import {ContentSelectColumns} from "@/components/relation/table/table-column/content-select-columns";


export interface ColumnHeadDropDownProps extends ColumnHeadProps {

}

export function ColumnDropDownContent(props: ColumnHeadDropDownProps) {

    const columnNames = props.data.columns.map(col => col.name);

    function onCopyName() {
        navigator.clipboard.writeText(props.column.name);
    }

    const tableState = props.relationState.viewState.tableState;

    function onHideColumn() {
        const newColumnsHidden = [...tableState.columnsHidden];
        newColumnsHidden.push(props.column.name);

        props.updateRelationViewState({
            tableState: {
                ...tableState,
                columnsHidden: newColumnsHidden
            }
        });
    }


    const thisColumnHidden = tableState.columnsHidden.includes(props.column.name);

    return <>
        <DropdownMenuLabel className={"whitespace-nowrap w-[2rem] pr-2"}>
            Column "{props.column.name}"
        </DropdownMenuLabel>
        <DropdownMenuSeparator/>
        <DropdownMenuGroup>
            <DropdownMenuItem onClick={onCopyName}>
                <Copy/>
                <span>Copy Name</span>
            </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator/>
        <DropdownMenuGroup>
            <DropdownMenuItem onClick={onHideColumn}>
                <AdaptiveEyeOff visible={thisColumnHidden}/>
                <span>{thisColumnHidden ? "Show Column" : "Hide Column"}</span>
            </DropdownMenuItem>
            <ContentSelectColumns {...props} columnNames={columnNames}>
                <EyeOff className={"opacity-0"}/>
                <span>Hide other Columns</span>
            </ContentSelectColumns>
        </DropdownMenuGroup>
    </>
}
