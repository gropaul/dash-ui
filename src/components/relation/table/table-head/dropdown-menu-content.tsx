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
import {Check, Copy, EyeOff} from "lucide-react";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {cn} from "@/lib/utils";
import {AdaptiveEyeOff} from "@/components/relation/common/eye-icon";
import {useRelationData} from "@/state/relations-data.state";


interface ColumnHeadDropDownMenuContentProps extends ColumnHeadProps {
    columnNames: string[];

}

export function ColumnHeadDropDownMenuContent(props: ColumnHeadDropDownMenuContentProps) {

    const columnNames = props.columnNames;
    function onCopyName() {
        navigator.clipboard.writeText(props.column.name);
    }

    const tableState = props.relationState.viewState.tableState;

    function onHideColumn() {
        const newColumnsHidden = [...tableState.columnsHidden];
        newColumnsHidden.push(props.column.name);

        props.updateRelationViewState(props.relationState.id, {
            tableState: {
                ...tableState,
                columnsHidden: newColumnsHidden
            }
        });
    }

    function changeColumnState(columnName: string, hide: boolean) {
        const newColumnsHidden = [...tableState.columnsHidden];
        if (hide) {
            if (!newColumnsHidden.includes(columnName)) {
                newColumnsHidden.push(columnName);
            }
        } else {
            const index = newColumnsHidden.indexOf(columnName);
            if (index > -1) {
                newColumnsHidden.splice(index, 1);
            }
        }

        props.updateRelationViewState(props.relationState.id, {
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
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <EyeOff className={"opacity-0"}/>
                    <span>Hide other Columns</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <Command>
                            <CommandInput placeholder={"Column Name"}/>
                            <CommandList>
                                <CommandEmpty>No Column found.</CommandEmpty>
                                <CommandGroup> {columnNames.map((name) => {
                                    const columnHidden = tableState.columnsHidden.includes(name);
                                    return (
                                        <CommandItem
                                            key={name}
                                            value={name}
                                            onSelect={(currentValue) => changeColumnState(currentValue, !columnHidden)}
                                        >
                                            {name}
                                            <Check
                                                className={cn(
                                                    "ml-auto",
                                                    !columnHidden ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    )
                                })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
        </DropdownMenuGroup>
    </>
}
