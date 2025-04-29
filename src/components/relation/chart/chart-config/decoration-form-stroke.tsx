import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import React from "react";
import {ColorSubMenu} from "@/components/relation/chart/chart-config/color-sub-menu";
import {DEFAULT_STROKE_DECORATION, StrokeDecoration} from "@/model/relation-view-state/chart";

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
            <Label>Stroke Dasharray</Label>
            <Input
                className="max-w-[80px]"
                type="text"
                placeholder="e.g. 5,5"
                value={props.stroke.dashArray ? props.stroke.dashArray : ''}
                onChange={(e) => updatePartial({dashArray: e.target.value})}
            />
        </div>

        <ColorSubMenu
            label="Stroke Color"
            color={props.stroke.color}
            setColor={(c) => updatePartial({color: c.hex})}
        />
    </>
} // DecorationFormStroke
