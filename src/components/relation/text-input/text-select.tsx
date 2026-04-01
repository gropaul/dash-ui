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
import {SelectionState} from "@/model/relation-view-state/selection";

function getSelectedIndices(selectionState?: SelectionState): Set<number> {
    return new Set(selectionState?.selectedIndices ?? []);
}

export function TextSelect(props: RelationViewContentProps) {
    const [open, setOpen] = React.useState(false)
    const data = props.data;

    const relationState = props.relationState
    const placeholder = relationState.viewState.inputTextState.placeholder || "Select..."
    const multiSelect = relationState.viewState.inputTextState.multiSelect !== false; // defaults to true
    const selectedIndices = getSelectedIndices(relationState.viewState.selectionState);

    const items = data?.rows.map((row, index) => ({
        index,
        label: row[0].toString(),
    })) || []

    const applySelection = (selection: SelectionState | undefined) => {
        // Build the value string from selected labels
        const newValue = selection
            ? selection.selectedIndices.map(i => items[i]?.label).filter(Boolean).join(', ')
            : "";

        props.updateRelationViewState({
            inputTextState: {
                value: newValue,
            },
            selectionState: selection,
        })

        // Re-register macro with filtered query and trigger downstream refresh
        const displayName = relationState.viewState.displayName;
        const baseQuery = relationState.query.baseQuery;
        const paramDefs = relationState.viewState.parametersState?.parameters;
        registerRelationMacro(displayName, baseQuery, paramDefs, selection).then(() => {
            const updatedState = {
                ...relationState,
                viewState: {
                    ...relationState.viewState,
                    selectionState: selection,
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
        const rowIndex = items.findIndex(item => item.label === selectedLabel);
        if (rowIndex < 0) return;

        if (multiSelect) {
            const newIndices = new Set(selectedIndices);
            if (newIndices.has(rowIndex)) {
                newIndices.delete(rowIndex);
            } else {
                newIndices.add(rowIndex);
            }

            const selection: SelectionState | undefined = newIndices.size > 0
                ? {selectedIndices: [...newIndices].sort((a, b) => a - b)}
                : undefined;

            applySelection(selection);
        } else {
            // Single select: toggle or replace
            const isDeselecting = selectedIndices.has(rowIndex) && selectedIndices.size === 1;
            const selection: SelectionState | undefined = isDeselecting
                ? undefined
                : {selectedIndices: [rowIndex]};

            applySelection(selection);
            setOpen(false);
        }
    }

    const selectedLabels = [...selectedIndices].map(i => items[i]?.label).filter(Boolean);
    const displayText = selectedLabels.length === 0
        ? placeholder
        : selectedLabels.length <= 2
            ? selectedLabels.join(', ')
            : `${selectedLabels.slice(0, 2).join(', ')} + ${selectedLabels.length - 2} more`;

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
                                                selectedIndices.has(item.index) ? "opacity-100" : "opacity-0"
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
