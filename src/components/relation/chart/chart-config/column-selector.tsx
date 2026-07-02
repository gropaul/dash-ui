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
    placeholder?: string
    plotType: PlotType
    columns: Column[]
    axisType: AxisType
} & (SingleSelectProps | MultiSelectProps)

const PLACEHOLDER = "Select column..."

export function ColumnSelector(props: ColumnSelectorProps) {
    const {columns, axisType} = props

    if (props.multiSelect) {
        const {selectedColumnIds, onColumnToggled} = props
        const allVisible = selectedColumnIds.length === columns.length
        const buttonLabel = allVisible
            ? 'All columns'
            : `${selectedColumnIds.length} / ${columns.length} visible`

        return (
            <ColumnCombobox
                columns={columns}
                axisType={axisType}
                triggerContent={<span>{buttonLabel}</span>}
                inputPlaceholder="Search columns..."
                isSelected={(id) => selectedColumnIds.includes(id)}
                onSelect={onColumnToggled}
            />
        )
    }

    // Single-select mode
    const {axis, updateAxis, deleteAxis} = props
    const decorationMenu = props.decorationMenu ?? false
    const placeholder = props.placeholder ?? PLACEHOLDER
    const currentColumn = columns.find((column) => column.id === axis?.columnId)

    function setAxisId(columnId: string) {
        updateAxis({columnId})
    }

    function updateAxisDecoration(decoration: AxisDecoration) {
        updateAxis({decoration})
    }

    const triggerContent = (
        <>
            {currentColumn && (
                <ValueIcon size={14} key={currentColumn.id} type={currentColumn.type}/>
            )}
            <div>{axis?.columnId ? currentColumn?.name : placeholder}</div>
        </>
    )

    const deleteFooter = deleteAxis && (
        <>
            <Separator/>
            <CommandGroup>
                <CommandItem onSelect={deleteAxis}>
                    <Trash2/>
                    <span>Delete</span>
                </CommandItem>
            </CommandGroup>
        </>
    )

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
                <ColumnCombobox
                    columns={columns}
                    axisType={axisType}
                    triggerContent={triggerContent}
                    inputPlaceholder={placeholder}
                    isSelected={(id) => axis?.columnId === id}
                    onSelect={setAxisId}
                    closeOnSelect
                    footer={deleteFooter}
                />
            </div>
        </div>
    )
}

type ColumnComboboxProps = {
    columns: Column[]
    axisType: AxisType
    triggerContent: React.ReactNode
    inputPlaceholder: string
    isSelected: (columnId: string) => boolean
    onSelect: (columnId: string) => void
    closeOnSelect?: boolean
    footer?: React.ReactNode
}

function ColumnCombobox(props: ColumnComboboxProps) {
    const {columns, axisType, triggerContent, inputPlaceholder, isSelected, onSelect, closeOnSelect, footer} = props
    const [open, setOpen] = React.useState(false)

    function handleSelect(columnId: string) {
        onSelect(columnId)
        if (closeOnSelect) {
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-card"
                >
                    <div className="flex-1 flex items-center gap-2">
                        {triggerContent}
                    </div>
                    <div className="flex items-center gap-2">
                        <AxisDetails axis={axisType}/>
                        <ChevronDown/>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={inputPlaceholder}/>
                    <CommandList>
                        <CommandEmpty>No column found.</CommandEmpty>
                        <CommandGroup>
                            {columns.map((column) => (
                                <CommandItem
                                    key={column.id}
                                    value={column.id}
                                    onSelect={() => handleSelect(column.id)}
                                >
                                    <ValueIcon type={column.type}/>
                                    {column.name}
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            isSelected(column.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    {footer}
                </Command>
            </PopoverContent>
        </Popover>
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
