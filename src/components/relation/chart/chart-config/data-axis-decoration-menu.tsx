import React from "react";
import {ColorResult, SketchPicker} from "react-color";
import {DEFAULT_COLORS} from "@/platform/global-data";

// shadcn/ui (or your own components)
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Separator} from "@/components/ui/separator";

import {
    AxisDecoration,
    BarAxisDecoration,
    PieAxisDecoration,
    PlotType,
    RadarAxisDecoration,
    ScatterAxisDecoration,
} from "@/model/relation-view-state/chart";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {parseString} from "@/components/relation/chart/chart-config/config-view-cartesian";
import {DecorationFormPlotLine} from "@/components/relation/chart/chart-config/decoration-form-plot-line";
import {DecorationFormPlotArea} from "@/components/relation/chart/chart-config/decoration-form-plot-area";
import {DecorationFormPlotScatter} from "@/components/relation/chart/chart-config/decoration-form-plot-scatter";

/* -------------------------------------------------------------------------- */
/* Original ColorSubMenu (unchanged) */

/* -------------------------------------------------------------------------- */

interface ColorSubMenuProps {
    label: string;
    color: string;
    setColor: (color: ColorResult) => void;
}

export function ColorSubMenu(props: ColorSubMenuProps) {
    const {color, setColor} = props;

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger withArrow={false} inset={false}>
                <div className="flex items-center gap-2 justify-between w-full">
                    <Label>{props.label}</Label>
                    <div
                        className="inline-block bg-white rounded-sm shadow border border-muted-foreground cursor-pointer h-4 w-4"
                        style={{
                            background: color,
                        }}
                    />
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <SketchPicker
                        styles={{
                            default: {
                                picker: {
                                    boxShadow: "none",
                                    border: "none",
                                },
                            },
                        }}
                        disableAlpha
                        color={color}
                        onChange={setColor}
                        presetColors={DEFAULT_COLORS}
                    />
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );
}

export interface DecorationMenuProps {
    plotType: PlotType;
    decoration: AxisDecoration;
    setDecoration: (decoration: AxisDecoration) => void;
}

export function DataAxisDecorationMenu(props: DecorationMenuProps) {
    const {decoration, setDecoration} = props;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                {/* Series-level color swatch */}
                <div
                    className="inline-block bg-white rounded-sm shadow border border-gray-300 cursor-pointer h-4 w-4"
                    style={{
                        background: decoration.color,
                    }}
                />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 text-sm">
                {/* Submenu for main series color */}

                <ChartSpecificDecoration {...props} />

            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Chooses which sub-menu to show based on `plotType`.
 */
export function ChartSpecificDecoration(props: DecorationMenuProps) {
    const {plotType} = props;
    switch (plotType) {
        case "scatter":
            return <DecorationFormPlotScatter {...props} />;
        case "line":
            return <DecorationFormPlotLine {...props} />;
        case "area":
            return <DecorationFormPlotArea {...props} />;
        case "bar":
            return <BarAxisDecorationMenu {...props} />;
        case "radar":
            return <DecorationFormPlotArea {...props} />;
        default:
            return null;
    }
}


/* -------------------------------------------------------------------------- */
/* BAR AXIS DECORATION MENU */

/* -------------------------------------------------------------------------- */

function BarAxisDecorationMenu({decoration, setDecoration}: DecorationMenuProps) {
    const bar = decoration.bar;

    const updateBar = (partial: Partial<BarAxisDecoration>) => {
        setDecoration({
            ...decoration,
            bar: {
                ...bar,
                ...partial,
            },
        });
    };

    const handleColorChange = (color: ColorResult) => {
        setDecoration({
            ...decoration,
            color: color.hex,
        });
    };

    const updateBarBorder = (partial: Partial<BarAxisDecoration["border"]>) => {
        setDecoration({
            ...decoration,
            bar: {
                ...bar,
                border: {
                    ...bar.border,
                    ...partial,
                },
            },
        });
    };

    return (
        <>
            {/* Bar Main */}
            <ColorSubMenu
                label="Fill Color"
                color={decoration.color}
                setColor={handleColorChange}
            />
            <div className="px-2 py-1.5 flex items-center justify-between w-full">
                <Label>Bar Width (px)</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    placeholder="Auto"
                    value={decoration.bar.barWidth ?? ''}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                        updateBar({barWidth: parseString(e.target.value)})
                    }/>
            </div>
            <div className="px-2 py-1.5 flex items-center justify-between w-full">
                <Label>Corner Radius</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={bar.cornerRadius}
                    onChange={(e) => updateBar({cornerRadius: +e.target.value})}
                />
            </div>

            <div className="px-2 py-1.5 flex items-center justify-between w-full">

                <Label>Fill Opacity</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    step={1}
                    min={0}
                    max={100}
                    placeholder="100"
                    value={bar.fillOpacity === 1.0 ? '' : Math.round(bar.fillOpacity * 100)}
                    onChange={(e) => {
                        const raw = parseFloat(e.target.value);
                        const clamped = Math.max(0, Math.min(100, isNaN(raw) ? 100 : raw));
                        updateBar({fillOpacity: clamped / 100});
                    }}
                />
            </div>

            <Separator className="my-2"/>

            {/* Border */}
            <div className="px-2 py-1.5 flex items-center justify-between w-full">
                <Label>Border Width</Label>
                <Input
                    className="max-w-[80px]"
                    type="number"
                    value={bar.border.width}
                    onChange={(e) => updateBarBorder({width: +e.target.value})}
                />
            </div>

            <ColorSubMenu
                label="Border Color"
                color={bar.border.color}
                setColor={(c) => updateBarBorder({color: c.hex})}
            />
        </>
    );
}