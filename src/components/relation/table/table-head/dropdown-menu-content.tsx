import React from "react";
import {ColumnHeadProps} from "@/components/relation/table/table-head/table-column-head";
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {Check, Copy, EyeOff} from "lucide-react";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {cn} from "@/lib/utils";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {AdaptiveEyeOff} from "@/components/relation/common/eye-icon";


interface ColumnHeadDropDownMenuContentProps extends ColumnHeadProps {


}

export function ColumnHeadDropDownMenuContent(props: ColumnHeadDropDownMenuContentProps) {

    const relationsState = useRelationsState((state) => state.getRelation(props.relationId), shallow);
    const updateRelation = useRelationsState((state) => state.updateRelationViewState);

    let columnNames: string[] = []
    if (relationsState.data) {
        columnNames = relationsState.data.columns.map((column) => column.name);
    }

    function onCopyName() {
        navigator.clipboard.writeText(props.column.name);
    }

    const tableState = relationsState.viewState.tableState;

    function onHideColumn() {
        const newColumnsHidden = [...tableState.columnsHidden];
        newColumnsHidden.push(props.column.name);

        updateRelation(props.relationId, {
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

        updateRelation(props.relationId, {
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
