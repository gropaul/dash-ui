import React from "react";
import {ColorResult, SketchPicker} from "react-color";
import {DEFAULT_COLORS} from "@/platform/global-data";

// shadcn/ui (or your own components)
import {Label} from "@/components/ui/label";

import {
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

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