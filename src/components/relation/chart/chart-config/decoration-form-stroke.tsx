import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import React from "react";
import {ColorSubMenu} from "@/components/relation/chart/chart-config/color-sub-menu";
import {DEFAULT_STROKE_DECORATION, LineStyle, StrokeDecoration} from "@/model/relation-view-state/chart";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

interface DecorationFormStrokeProps {
    stroke: StrokeDecoration,
    updateStroke: (stroke: StrokeDecoration) => void
}

export function DecorationFormStroke(props: DecorationFormStrokeProps) {

    function updatePartial(stroke: Partial<StrokeDecoration>) {
        props.updateStroke({
            ...DEFAULT_STROKE_DECORATION,
            ...props.stroke,
            ...stroke,
        });
    }

    return <>
        {/* Stroke Settings */}
        <div className="px-2 py-1.5 flex items-center justify-between w-full">
            <Label>Stroke Width</Label>
            <Input
                className="max-w-[80px]"
                type="number"
                min={0}
                placeholder={DEFAULT_STROKE_DECORATION.width?.toString()}
                value={props.stroke.width ? props.stroke.width : ''}
                onChange={(e) => updatePartial({width: +e.target.value})}
            />
        </div>

        <div className="px-2 py-1.5 flex items-center justify-between w-full">
            <Label>Line Style</Label>
            <Select
                value={props.stroke.lineStyle || 'solid'}
                onValueChange={(value: LineStyle) => updatePartial({lineStyle: value})}
            >
                <SelectTrigger className="max-w-[120px]">
                    <SelectValue placeholder="TextSelect style" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <ColorSubMenu
            label="Stroke Color"
            color={props.stroke.color}
            setColor={(c) => updatePartial({color: c.hex})}
        />
    </>
} // DecorationFormStroke
