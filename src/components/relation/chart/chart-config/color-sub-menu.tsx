import React, {useEffect, useMemo, useState} from "react";
import {ColorResult, SketchPicker} from "react-color";
import {DEFAULT_COLORS} from "@/platform/global-data";
import {Label} from "@/components/ui/label";
import {
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {throttleLatest} from "@/lib/throttle-latest";

interface ColorSubMenuProps {
    label: string;
    color: string; // global color
    debounceMs?: number; // default 120ms
    setColor: (color: ColorResult) => void;
}

export function ColorSubMenu(props: ColorSubMenuProps) {
    const { color: globalColor, setColor, debounceMs = props.debounceMs ?? 300 } = props;

    // local color state to update instantly
    const [localColor, setLocalColor] = useState(globalColor);

    // create throttled updater (memoize, so it doesn’t recreate every render)
    const throttledSetColor = useMemo(
        () => throttleLatest(setColor, debounceMs),
        [setColor, debounceMs]
    );

    // keep the local state in sync if global changes from outside
    useEffect(() => {
        setLocalColor(globalColor);
    }, [globalColor]);


    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger withArrow={false} inset={false}>
                <div className="flex items-center gap-2 justify-between w-full">
                    <Label>{props.label}</Label>
                    <div
                        className="inline-block bg-white rounded-sm shadow border border-muted-foreground cursor-pointer h-4 w-4"
                        style={{ background: localColor }}
                    />
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <SketchPicker
                        styles={{ default: { picker: { boxShadow: "none", border: "none" } } }}
                        disableAlpha
                        color={localColor}
                        onChange={(color) => {
                            setLocalColor(color.hex);     // instant local update
                            throttledSetColor(color);     // at most one global update per interval (latest wins)
                        }}
                        presetColors={DEFAULT_COLORS}
                    />
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );
}
