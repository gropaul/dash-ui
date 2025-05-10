"use client"

import * as React from "react"
import {Check, ChevronsUpDown, Settings} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {RelationViewProps} from "@/components/relation/relation-view"
import {SelectConfigDialog} from "@/components/relation/select/select-config-dialog"
import {SelectViewState} from "@/model/relation-view-state/select"

export function Select(props: RelationViewProps) {
    const [open, setOpen] = React.useState(false)

    const relationId = props.relationState.id
    const viewState = props.relationState
    const showConfig = viewState.viewState.selectState.showConfig || false
    const placeholder = viewState.viewState.selectState.placeholder || "Select..."
    const value = viewState.viewState.selectState.value;
    const name = viewState.name || ""

    const setShowConfig = (show: boolean) => {
        props.updateRelationViewState(relationId, {
            selectState: {
                showConfig: show,
            }
        })
    }

    const setValue = (value: string) => {
        props.updateRelationViewState(relationId, {
            selectState: {
                value: value,
            }
        })
    }

    const items = props.relationState.data?.rows.map(row => ({
        value: row[0],
        label: row[0]
    })) || []


    return (
        <div className='pt-0.5 pb-0.5 flex flex-row gap-2 items-center justify-start group'>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[200px] justify-between relative"
                    >
                        {value
                            ? items.find((item) => item.value === value)?.label
                            : placeholder}
                        <ChevronsUpDown className="opacity-50"/>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search..." className="h-9"/>
                        <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {items.map((item) => (
                                    <CommandItem
                                        key={item.value}
                                        value={item.value}
                                        onSelect={(currentValue) => {
                                            setValue(currentValue === value ? "" : currentValue)
                                            setOpen(false)
                                        }}
                                    >
                                        {item.label}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                value === item.value ? "opacity-100" : "opacity-0"
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
            <SelectConfigDialog
                isOpen={showConfig}
                onOpenChange={setShowConfig}
                {...props}
            />
        </div>
    )
}
