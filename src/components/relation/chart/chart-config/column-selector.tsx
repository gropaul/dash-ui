"use client"

import * as React from "react"
import {ArrowUpDown, CaseSensitive, Check, ChevronDown, Columns3, Component, ListFilter, MoveRight, MoveUp, Radius, Settings2, Trash2} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {Muted} from "@/components/ui/typography";
import {AxisConfig, AxisDecoration, getInitialAxisDecoration, PlotType} from "@/model/relation-view-state/chart";
import {Separator} from "@/components/ui/separator";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {DataAxisDecorationMenu} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";
import {Column} from "@/model/data-source-connection";

export type AxisType = "x" | "y" | 'pie-label' | 'pie-radius' | 'group' | 'slider' | 'select' | 'columns' | 'sort'

type SingleSelectProps = {
    multiSelect?: false
    axis?: AxisConfig
    decorationMenu?: boolean
    prefix?: React.ReactNode
    updateAxis: (update: Partial<AxisConfig>) => void
    deleteAxis?: () => void
}

type MultiSelectProps = {
    multiSelect: true
    selectedColumnIds: string[]
    onColumnToggled: (columnId: string) => void
}

type ColumnSelectorProps = {
    plotType: PlotType
    columns: Column[]
    axisType: AxisType
} & (SingleSelectProps | MultiSelectProps)

const PLACEHOLDER = "Select column..."

export function ColumnSelector(props: ColumnSelectorProps) {
    const {columns, axisType} = props
    const [open, setOpen] = React.useState(false)

    if (props.multiSelect) {
        const {selectedColumnIds, onColumnToggled} = props
        const allVisible = selectedColumnIds.length === columns.length
        const buttonLabel = allVisible
            ? 'All columns'
            : `${selectedColumnIds.length} / ${columns.length} visible`

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <div className="flex-1 flex items-center gap-2">
                            <span>{buttonLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AxisDetails axis={axisType}/>
                            <ChevronDown/>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search columns..."/>
                        <CommandList>
                            <CommandEmpty>No column found.</CommandEmpty>
                            <CommandGroup>
                                {columns.map((column) => (
                                    <CommandItem
                                        key={column.id}
                                        value={column.id}
                                        onSelect={(id) => onColumnToggled(id)}
                                    >
                                        <ValueIcon type={column.type}/>
                                        {column.name}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                selectedColumnIds.includes(column.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        )
    }

    // Single-select mode
    const {axis, updateAxis, deleteAxis} = props
    const decorationMenu = props.decorationMenu ?? false
    const currentColumn = columns.find((column) => column.id === axis?.columnId)

    function setAxisId(columnId: string) {
        updateAxis({columnId})
    }

    function updateAxisDecoration(decoration: AxisDecoration) {
        updateAxis({decoration})
    }

    return (
        <div className='flex flex-row gap-2 items-center w-full'>
            {props.prefix}
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
            <div className="flex-1 min-w-0">
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
                                            <span>Delete</span>
                                        </CommandItem>
                                    </CommandGroup>
                                </>
                            )}
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
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
                <Component size={8} className="text-indigo-600"/>
                <Muted>Group</Muted>
            </>
        case "slider":
            return <>
                <Settings2 size={8} className="text-indigo-600"/>
                <Muted>Value</Muted>
            </>
        case "select":
            return <>
                <ListFilter size={8} className="text-indigo-600"/>
                <Muted>Filter</Muted>
            </>
        case "columns":
            return <>
                <Columns3 size={8} className="text-indigo-600"/>
                <Muted>Columns</Muted>
            </>
        case "sort":
            return <>
            </>
        default:
            throw new Error(`Unsupported axis type: ${axis}`)
    }
}
