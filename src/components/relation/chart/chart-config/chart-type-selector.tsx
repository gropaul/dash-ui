import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {ChartArea, ChartBar, ChartLine, ChartPie, ChartScatter, Check, ChevronDown, Hexagon} from "lucide-react";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {cn} from "@/lib/utils";
import * as React from "react";
import {AVAILABLE_PLOT_TYPES, PlotType} from "@/model/relation-view-state/chart";


interface ChartTypeSelectorProps {
    type: PlotType,
    onPlotTypeChange: (type: PlotType) => void
}

export function ChartTypeSelector(props: ChartTypeSelectorProps) {

    const [open, setOpen] = React.useState(false)

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
                        <ChartTypeIcon type={props.type}/>
                        <ChartTypeLabel type={props.type}/>
                    </div>
                    <ChevronDown/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput/>
                    <CommandList>
                        <CommandEmpty>No Chart Found</CommandEmpty>
                        <CommandGroup>
                            {AVAILABLE_PLOT_TYPES.map((type) => (
                                <CommandItem
                                    key={type}
                                    value={type}
                                    onSelect={(currentValue) => {
                                        props.onPlotTypeChange(currentValue as PlotType)
                                        setOpen(false)
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <ChartTypeIcon type={type}/>
                                        <ChartTypeLabel type={type}/>
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            props.type  === type ? "opacity-100" : "opacity-0"
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

export function ChartTypeLabel(props: { type: PlotType }) {
    switch (props.type) {
        case "line":
            return "Line"
        case "bar":
            return "Bar"
        case "area":
            return "Area"
        case "scatter":
            return "Scatter"
        case "pie":
            return "Pie"
        case "radar":
            return "Radar"
    }
}

export function ChartTypeIcon(props: { type: PlotType }) {
    switch (props.type) {
        case "line":
            return <ChartLine />
        case "bar":
            return <ChartBar />
        case "area":
            return <ChartArea />
        case "scatter":
            return <ChartScatter />
        case "pie":
            return <ChartPie />
        case "radar":
            return <Hexagon />
        }
}