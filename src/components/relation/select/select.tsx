"use client"

import * as React from "react"
import {Check, ChevronsUpDown} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {ViewManager} from "@/model/relation-state/relation-view";
import {SelectQueryParameters} from "@/model/relation-state/relation-view-select";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {Label} from "@/components/ui/label";
import {Separator} from "@/components/ui/separator";

export function getDisplayText(params: SelectQueryParameters, values: string[]): string {
    return values.length === 0
        ? params.placeholder ?? 'Select...'
        : values.length <= 2
            ? values.join(', ')
            : `${values.slice(0, 2).join(', ')} + ${values.length - 2} more`;

}

export function Select(props: RelationViewContentProps) {
    const [open, setOpen] = React.useState(false)

    const actions = getRelationActions(props)
    const params = ViewManager.instance.select.getQueryParameters(props.relationState);
    const state = ViewManager.instance.select.getQueryState(props.relationState);

    const selectedValuesString = state.selectedValues.map(String);
    const possibleValues = props.data.rows.map(row => row[0]);
    const possibleValuesString = possibleValues.map(String);

    function onSelect(index: number) {
        const newValue = possibleValues[index];

        let newSelectedValues;
        const valueAlreadySelected = state.selectedValues.includes(newValue);

        if (params.multiSelect) {
            if (valueAlreadySelected) {
                newSelectedValues = state.selectedValues.filter(v => v !== newValue);
            } else {
                newSelectedValues = [...state.selectedValues, newValue];
            }
        } else {
            if (valueAlreadySelected) {
                newSelectedValues = [];
            } else {
                newSelectedValues = [newValue];
            }
        }

        actions.updateRelationQueryState({
            select: {
                ...state,
                selectedValues: newSelectedValues,
            }
        })
    }

    return (
        <div className='pt-0.5 pb-0.5 flex flex-row w-full gap-2 items-center justify-start group'>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between relative flex-row"
                    >
                        {params.label && (
                            <>
                                <Label className={"w-fit text-muted-foreground"}>
                                    {params.label}
                                </Label>
                                <Separator orientation="vertical" className="mx-2 h-4" />
                            </>
                        )}
                        <div className="truncate flex-grow text-left">{getDisplayText(params, selectedValuesString)}</div>
                        <ChevronsUpDown className="opacity-50"/>
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-full p-0">
                    <Command>
                        <CommandInput placeholder="Search..." className="h-9"/>
                        <CommandList className="max-h-60">
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {possibleValuesString.map((item, index) => (
                                    <CommandItem
                                        key={item}
                                        value={item}
                                        onSelect={() => onSelect(index)}
                                    >
                                        {item}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                selectedValuesString.includes(item) ? "opacity-100" : "opacity-0",
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
