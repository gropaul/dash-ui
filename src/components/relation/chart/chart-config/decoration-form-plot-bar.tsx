import React from "react";
import {BarAxisDecoration} from "@/model/relation-view-state/chart";
import {DecorationMenuProps} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";
import {ColorSubMenu} from "@/components/relation/chart/chart-config/color-sub-menu";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {parseString} from "@/components/relation/chart/chart-config/config-view-cartesian";

export function DecorationFormPlotBar({decoration, setDecoration}: DecorationMenuProps) {
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

    const handleColorChange = (color: any) => {
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