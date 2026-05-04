"use client"

import * as React from "react"
import {Check, ChevronsUpDown} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {registerRelationMacro} from "@/state/relations/sql/table-macros";
import {RelationEvents} from "@/state/relations/event/relation-events";
import {SelectSelectionSate} from "@/model/relation-view-state/selection";

function getSelectedLabels(selectionState?: SelectSelectionSate): Set<string> {
    return new Set(selectionState?.selectedValues.map(String) ?? []);
}

export function TextSelect(props: RelationViewContentProps) {
    const [open, setOpen] = React.useState(false)
    const data = props.data;

    const relationState = props.relationState
    const placeholder = relationState.viewState.inputTextState.placeholder || "Select..."
    const multiSelect = relationState.viewState.inputTextState.multiSelect !== false; // defaults to true
    const selectState = relationState.viewState.selectionState?.select;
    const selectedLabels = getSelectedLabels(selectState);

    const columnName = data?.columns[0]?.name ?? '';

    const items = data?.rows.map((row, index) => ({
        index,
        label: row[0].toString(),
        value: row[0],
    })) || []

    const applySelection = (selection: SelectSelectionSate | undefined) => {
        // Build the value string from selected labels
        const newValue = selection
            ? selection.selectedValues.map(String).join(', ')
            : "";

        props.updateRelationViewState({
            inputTextState: {
                value: newValue,
            },
            selectionState: {
                select: selection,
            }
        })

        // Re-register macro with filtered query and trigger downstream refresh
        const displayName = relationState.viewState.displayName;
        const baseQuery = relationState.query.baseQuery;
        const paramDefs = relationState.viewState.parametersState?.parameters;
        registerRelationMacro(displayName, baseQuery, paramDefs, relationState.viewState.selectionState).then(() => {
            const updatedState = {
                ...relationState,
                viewState: {
                    ...relationState.viewState,
                    selectionState: {
                        ...relationState.viewState.selectionState,
                        select: selection,
                    },
                    inputTextState: {
                        ...relationState.viewState.inputTextState,
                        value: newValue,
                    },
                },
            };
            RelationEvents.updateSelection(relationState, updatedState);
        });
    }

    const onSelect = (selectedLabel: string) => {
        const item = items.find(item => item.label === selectedLabel);
        if (!item) return;

        if (multiSelect) {
            const currentValues = selectState?.selectedValues ?? [];
            const currentLabels = new Set(currentValues.map(String));

            let newValues: any[];
            if (currentLabels.has(item.label)) {
                // Remove this value
                newValues = currentValues.filter(v => String(v) !== item.label);
            } else {
                // Add this value
                newValues = [...currentValues, item.value];
            }

            const selection: SelectSelectionSate | undefined = newValues.length > 0
                ? {columnName, selectedValues: newValues}
                : undefined;

            applySelection(selection);
        } else {
            // Single select: toggle or replace
            const isDeselecting = selectedLabels.has(item.label) && selectedLabels.size === 1;
            const selection: SelectSelectionSate | undefined = isDeselecting
                ? undefined
                : {columnName, selectedValues: [item.value]};

            applySelection(selection);
            setOpen(false);
        }
    }

    const displayLabels = [...selectedLabels];
    const displayText = displayLabels.length === 0
        ? placeholder
        : displayLabels.length <= 2
            ? displayLabels.join(', ')
            : `${displayLabels.slice(0, 2).join(', ')} + ${displayLabels.length - 2} more`;

    return (
        <div className='pt-0.5 pb-0.5 flex flex-row w-full gap-2 items-center justify-start group'>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between relative"
                    >
                        <span className="truncate">{displayText}</span>
                        <ChevronsUpDown className="opacity-50"/>
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-full p-0">
                    <Command>
                        <CommandInput placeholder="Search..." className="h-9"/>
                        <CommandList className="max-h-60">
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {items.map((item) => (
                                    <CommandItem
                                        key={item.index}
                                        value={item.label}
                                        onSelect={(currentValue) => {
                                            onSelect(currentValue)
                                        }}
                                    >
                                        {item.label}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                selectedLabels.has(item.label) ? "opacity-100" : "opacity-0"
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
