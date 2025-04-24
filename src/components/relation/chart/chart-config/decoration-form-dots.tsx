import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Input} from "@/components/ui/input";
import {ColorSubMenu} from "@/components/relation/chart/chart-config/color-sub-menu";
import React from "react";
import {
    DEFAULT_DOTS_DECORATION,
    DotsDecoration,
    DotsShape,
    ScatterAxisDecoration
} from "@/model/relation-view-state/chart";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";


export interface DecorationFormDotsProps {
    dots: DotsDecoration;
    setDots: (decoration: DotsDecoration) => void;
    alwaysShowDots?: boolean
}

export function DecorationFormDots(props: DecorationFormDotsProps) {

    function updateDots(dots: Partial<DotsDecoration>) {
        props.setDots({
            ...DEFAULT_DOTS_DECORATION,
            ...props.dots,
            ...dots,
        });
    }

    const showDots = (props.alwaysShowDots ?? false) || props.dots.visible;

    return <>
        {
            !props.alwaysShowDots  && <div className="px-2 py-1.5 flex items-center justify-between w-full">
                <Label>Show Symbols</Label>
                <Switch
                    checked={props.dots.visible}
                    onCheckedChange={(checked) => updateDots({visible: checked})}
                />
            </div>
        }

        {showDots  && (
            <>
                <div className="px-2 py-1.5 flex items-center justify-between w-full">
                    <Label>Symbol Shape</Label>
                    <Select
                        value={props.dots.shape}
                        onValueChange={(v) =>
                            updateDots({shape: v as DotsShape})
                        }
                    >
                        <SelectTrigger className="max-w-[120px]">
                            <SelectValue placeholder="Select shape"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="circle">Circle</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="triangle">Triangle</SelectItem>
                            <SelectItem value="diamond">Diamond</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between w-full">

                    <Label>Symbol Size</Label>
                    <Input
                        className="max-w-[80px]"
                        type="number"
                        placeholder={DEFAULT_DOTS_DECORATION.radius?.toString()}
                        value={props.dots.radius ? props.dots.radius : ''}
                        onChange={(e) => updateDots({radius: +e.target.value})}
                    />
                </div>
                <div className="px-2 py-1.5 flex items-center justify-between w-full hover:bg-gray-50">

                    <Label>Symbol Border Width</Label>
                    <Input
                        className="max-w-[80px]"
                        type="number"
                        placeholder={DEFAULT_DOTS_DECORATION.borderWidth?.toString()}
                        value={props.dots.borderWidth ? props.dots.borderWidth : ''}
                        onChange={(e) => updateDots({borderWidth: +e.target.value})}
                    />
                </div>

                <ColorSubMenu
                    label="Symbol Fill"
                    color={props.dots.fill}
                    setColor={(c) => updateDots({fill: c.hex})}
                />
            </>
        )}</>
}
