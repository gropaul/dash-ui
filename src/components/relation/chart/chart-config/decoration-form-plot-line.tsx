import {DotsDecoration, StrokeDecoration} from "@/model/relation-view-state/chart";
import {Separator} from "@/components/ui/separator";
import React from "react";
import {DecorationMenuProps} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";
import {DecorationFormStroke} from "@/components/relation/chart/chart-config/decoration-form-stroke";
import {DecorationFormDots} from "@/components/relation/chart/chart-config/decoration-form-dots";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";


export function DecorationFormPlotLine({decoration, setDecoration}: DecorationMenuProps) {
    const line = decoration.line;
    const scatter = decoration.scatter;

    const updateStroke = (stroke: StrokeDecoration) => {
        setDecoration({
            ...decoration,
            line: {
                ...line,
                stroke: stroke,
            },
            color: stroke.color,
        });
    };

    const updateSmooth = (smooth: boolean) => {
        setDecoration({
            ...decoration,
            line: {
                ...line,
                smooth: smooth,
            },
        });
    };

    const updateDots = (partial: Partial<DotsDecoration>) => {
        setDecoration({
            ...decoration,
            scatter: {
                dots: {
                    ...scatter.dots,
                    ...partial,
                },
            }
        });
    };

    return (
        <>
            {/* Stroke Settings */}
            <DecorationFormStroke
                stroke={line.stroke}
                updateStroke={updateStroke}
            />

            <div className="px-2 py-1.5 flex items-center justify-between w-full">
                <Label>Smooth Line</Label>
                <Switch
                    checked={line.smooth}
                    onCheckedChange={updateSmooth}
                />
            </div>

            <Separator className="my-2"/>

            {/* Dots Group */}
            <DecorationFormDots
                alwaysShowDots={false}

                dots={scatter.dots}
                setDots={updateDots}
            />

        </>
    );
}
