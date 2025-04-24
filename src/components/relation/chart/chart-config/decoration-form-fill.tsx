import {ColorSubMenu} from "@/components/relation/chart/chart-config/color-sub-menu";
import {Input} from "@/components/ui/input";
import {DEFAULT_FILL_DECORATION, FillDecoration} from "@/model/relation-view-state/chart";

import {Label} from "@/components/ui/label";
import {useEffect, useState} from "react";

export interface DecorationFormFillProps {
    fill: FillDecoration,
    setFill: (decoration: FillDecoration) => void;
}

export function DecorationFormFill(props: DecorationFormFillProps) {

    const updatePartial = (fill: Partial<FillDecoration>) => {
        props.setFill({
            ...DEFAULT_FILL_DECORATION,
            ...props.fill,
            ...fill,
        });
    }

    const [internalValue, setInternalValue] = useState(
        props.fill.opacity !== undefined ? Math.round(props.fill.opacity * 100).toString() : ''
    );

    useEffect(() => {
        // keep internal value in sync with props unless the user is actively editing
        if (props.fill.opacity !== undefined && props.fill.opacity !== parseFloat(internalValue) / 100) {
            setInternalValue(Math.round(props.fill.opacity * 100).toString());
        }
    }, [props.fill.opacity]);

    return <>
        <ColorSubMenu
            label="Fill Color"
            color={props.fill.color}
            setColor={(c) => updatePartial({color: c.hex})}
        />
        <div className="px-2 py-1.5 flex items-center justify-between w-full">
            <Label>Fill Opacity (%)</Label>
            <Input
                className="max-w-[80px]"
                type="number"
                step={1}
                min={0}
                max={100}
                placeholder="20"
                value={internalValue}
                onChange={(e) => {
                    const input = e.target.value;
                    setInternalValue(input);

                    const parsed = parseFloat(input);
                    if (!isNaN(parsed)) {
                        const clamped = Math.max(0, Math.min(100, parsed));
                        updatePartial({ opacity: clamped / 100 });
                    }
                }}
                onBlur={() => {
                    // on blur, if input is invalid or empty, reset to default
                    if (internalValue === '') {
                        const fallback = Math.round(DEFAULT_FILL_DECORATION.opacity! * 100).toString();
                        setInternalValue(fallback);
                        updatePartial({ opacity: DEFAULT_FILL_DECORATION.opacity! });
                    }
                }}
            />
        </div>
    </>
}
