"use client"

import * as React from "react"
import {CaseSensitive, Check, ChevronDown, Component, MoveRight, MoveUp, Radius, Trash2} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {Column} from "@/model/column";
import {Muted} from "@/components/ui/typography";
import {AxisConfig, AxisDecoration, getInitialAxisDecoration, PlotType} from "@/model/relation-view-state/chart";
import {Separator} from "@/components/ui/separator";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {DataAxisDecorationMenu} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";

export type AxisType = "x" | "y" | 'pie-label' | 'pie-radius' | 'group'

interface ColumnSelectorProps {
    plotType: PlotType
    columns: Column[]
    axis?: AxisConfig,
    decorationMenu? : boolean
    axisType: AxisType,
    updateAxis: (update: Partial<AxisConfig>) => void
    deleteAxis?: () => void
}

const PLACEHOLDER = "Select column..."

// @ts-ignore
export function ColumnSelector(props: ColumnSelectorProps) {
    const {columns, axis, axisType, updateAxis, deleteAxis} = props
    const [open, setOpen] = React.useState(false)
    const currentColumn = columns.find((column) => column.id === axis?.columnId)

    const decorationMenu = props.decorationMenu ?? false
    function setAxisId(columnId: string) {
        updateAxis({columnId})
    }

    function updateAxisDecoration(decoration: AxisDecoration) {
        updateAxis({decoration: decoration})
    }

    return (
        <div className='flex flex-row gap-2 items-center w-full justify-between'>
            {/* Button that opens the color picker popup for y-axis */}
            {decorationMenu && (
                <>
                    <div/>
                    <DataAxisDecorationMenu
                        plotType={props.plotType}
                        decoration={axis?.decoration ?? getInitialAxisDecoration(0)}
                        setDecoration={updateAxisDecoration}
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
                        <div className="flex-1 flex items-center gap-2">
                            {currentColumn && (
                                <ValueIcon size={14} key={currentColumn.id} type={currentColumn.type}/>
                            )}
                            {/* Column name, needs to shrinkg if not enough space */}
                            <div>
                                {axis?.columnId
                                    ? columns.find((column) => column.id === axis.columnId)?.name
                                    : PLACEHOLDER}
                            </div>
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
                            <CommandEmpty>No Column found.</CommandEmpty>
                            <CommandGroup>
                                {columns.map((column) => (
                                    <CommandItem
                                        key={column.id}
                                        value={column.id}
                                        onSelect={(currentValue) => {
                                            setAxisId(currentValue);
                                            setOpen(false);
                                        }}
                                    >
                                        <ValueIcon key={column.id} type={column.type}/>
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
                        {deleteAxis && (
                            <>
                                <Separator/>
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => {
                                            deleteAxis()
                                            setOpen(false)
                                        }}
                                    >
                                        <Trash2/>
                                        <span>Delete </span>
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}

                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}


function AxisDetails({axis}: { axis: AxisType }) {

    switch (axis) {
        case "x":
            return <>
                <MoveRight size={8} className="text-indigo-600"/>
                <Muted>X-Axis</Muted>
            </>
        case "y":
            return <>
                <MoveUp size={8} className="text-indigo-600"/>
                <Muted>Y-Axis</Muted>
            </>
        case "pie-label":
            return <>
                <CaseSensitive size={9} className="text-indigo-600"/>
                <Muted>Label</Muted>
            </>
        case "pie-radius":
            return <>
                <Radius size={7} className="text-indigo-600 pr-1"/>
                <Muted>Radius</Muted>
            </>
        case "group":
            return <>
                <Component  size={8} className="text-indigo-600"/>
                <Muted>Group</Muted>
            </>
        default:
            throw new Error(`Unsupported axis type: ${axis}`)

    }
}