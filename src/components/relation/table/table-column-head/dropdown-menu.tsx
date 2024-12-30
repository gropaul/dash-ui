import React from "react";
import {ColumnHeadProps} from "@/components/relation/table/table-column-head";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Check, Copy, Eye, EyeOff, Menu, Plus, RefreshCw, Settings, Trash2, UserPlus} from "lucide-react";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {cn} from "@/lib/utils";
import {Separator} from "@/components/ui/separator";
import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";

export function ColumnHeadDropDownMenu(props: ColumnHeadProps) {

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
        console.log("changeColumnState", columnName, hide);
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

        console.log("newColumnsHidden", newColumnsHidden);

        updateRelation(props.relationId, {
            tableState: {
                ...tableState,
                columnsHidden: newColumnsHidden
            }
        });
    }

    const thisColumnHidden = tableState.columnsHidden.includes(props.column.name);

    return (<>
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Menu
                    size={16}
                    className="hidden group-hover:block text-muted-foreground hover:text-primary cursor-pointer"
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
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
                            <span>Hide other columns</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <Command>
                                    <CommandInput placeholder={"Column Name"}/>
                                    <CommandList>
                                        <CommandEmpty>No Column found.</CommandEmpty>
                                        <CommandGroup>
                                            {columnNames.map((name) => {
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
            </DropdownMenuContent>
        </DropdownMenu>
    </>);
}

interface AdaptiveEyeOffProps {
    visible: boolean;
    className?: string;
}

export function AdaptiveEyeOff({visible, className}: AdaptiveEyeOffProps) {
    return visible ? <EyeOff className={className}/> : <Eye className={className}/>;
}
