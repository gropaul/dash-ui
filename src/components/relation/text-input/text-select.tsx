"use client"

import * as React from "react"
import {Check, ChevronsUpDown, Settings} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {TextInputConfigDialog} from "@/components/relation/text-input/text-input-config-dialog"
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {registerRelationMacro} from "@/state/relations/sql/table-macros";
import {RelationEvents} from "@/state/relations/event/relation-events";
import {SelectionState} from "@/model/relation-view-state/selection";

export function TextSelect(props: RelationViewContentProps) {
    const [open, setOpen] = React.useState(false)
    const data = props.data;

    const relationState = props.relationState
    const showConfig = relationState.viewState.inputTextState.showConfig || false
    const placeholder = relationState.viewState.inputTextState.placeholder || "Select..."
    const value = relationState.viewState.inputTextState.value;

    const setShowConfig = (show: boolean) => {
        props.updateRelationViewState( {
            inputTextState: {
                showConfig: show,
            }
        })
    }

    const items = data?.rows.map((row, index) => ({
        index,
        label: row[0].toString(),
    })) || []

    const onSelect = (selectedLabel: string) => {
        const isDeselecting = selectedLabel === value;
        const newValue = isDeselecting ? "" : selectedLabel;
        const rowIndex = items.findIndex(item => item.label === selectedLabel);
        const selection: SelectionState | undefined = isDeselecting || rowIndex < 0
            ? undefined
            : {selectedIndices: [rowIndex]};

        // Update both the input value and selection state
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
                        {value || placeholder}
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
                                            setOpen(false)
                                        }}
                                    >
                                        {item.label}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                value === item.label ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConfig(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            >
                <Settings className="h-4 w-4"/>
            </Button>
            <TextInputConfigDialog
                isOpen={showConfig}
                onOpenChange={setShowConfig}
                {...props}
            />
        </div>
    )
}