import {
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Check, EyeOff} from "lucide-react";
import {cn} from "@/lib/utils";
import React from "react";
import {RelationViewProps} from "@/components/relation/relation-view";
import {RelationData} from "@/model/relation";

export interface ContentSelectColumnsProps extends RelationViewProps {
    children: React.ReactNode;
    columnNames: string[];
}

export function ContentSelectColumns(props: ContentSelectColumnsProps) {

    const columnNames = props.columnNames;
    const tableState = props.relationState.viewState.tableState;

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

        props.updateRelationViewState({
            tableState: {
                ...tableState,
                columnsHidden: newColumnsHidden
            }
        });
    }

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                {props.children}
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
    )
}