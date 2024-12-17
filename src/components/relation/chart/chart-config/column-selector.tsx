"use client"

import * as React from "react"
import {Check, ChevronDown, MoveRight, MoveUp} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {Column} from "@/model/column";
import {ColumnIcon} from "@/components/relation/table/table-column-head";
import {Muted} from "@/components/ui/typography";
import PopupColorPicker from "@/components/ui/popup-color-picker";
import {AxisConfig} from "@/model/relation-view-state/chart";

interface ColumnSelectorProps {
    columns: Column[]
    axis?: AxisConfig,
    axisType: "x" | "y"
    updateAxis: (update: Partial<AxisConfig>) => void
}

const PLACEHOLDER = "Select column..."

// @ts-ignore
export function ColumnSelector({columns, axis, axisType, updateAxis}: ColumnSelectorProps) {

    const [open, setOpen] = React.useState(false)
    const currentColumn = columns.find((column) => column.id === axis?.columnId)

    function setAxisId(columnId: string) {
        updateAxis({columnId})
    }

    function setAxisColor(color: string) {
        updateAxis({color})
    }

    return (
        <div className='flex flex-row gap-2 items-center'>
            {/* Button that opens the color picker popup for y axis */}
            {axisType === "y" && (
                <>
                    <div />
                    <PopupColorPicker
                        color={axis?.color}
                        setColor={setAxisColor}
                    />
                </>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <div className="flex items-center gap-2">
                            {currentColumn && (
                                <ColumnIcon size={14} key={currentColumn.id} type={currentColumn.type}/>
                            )}
                            {axis?.columnId
                                ? columns.find((column) => column.id === axis.columnId)?.name
                                : PLACEHOLDER}
                        </div>
                        <div className="flex items-center gap-2">
                            <AxisDetails axis={axisType}/>
                            <ChevronDown/>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder={PLACEHOLDER}/>
                        <CommandList>
                            <CommandEmpty>No framework found.</CommandEmpty>
                            <CommandGroup>
                                {columns.map((column) => (
                                    <CommandItem
                                        key={column.id}
                                        value={column.id}
                                        onSelect={(currentValue) => {
                                            setAxisId(currentValue === axis?.columnId ? '' : currentValue)
                                            setOpen(false)
                                        }}
                                    >
                                        <ColumnIcon key={column.id} type={column.type}/>
                                        {column.name}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                axis?.columnId === column.id ? "opacity-100" : "opacity-0"
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


function AxisDetails({axis}: { axis: "x" | "y" }) {
    if (axis === "x") {
        return (
            <>
                <MoveRight size={8} className="text-indigo-600"/>
                <Muted>X-Axis</Muted>
            </>
        )
    } else {
        return (
            <>
                <MoveUp size={8} className="text-indigo-600"/>
                <Muted>Y-Axis</Muted>
            </>
        )
    }
}