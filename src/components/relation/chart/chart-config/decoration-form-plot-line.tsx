import {DotsDecoration, StrokeDecoration} from "@/model/relation-view-state/chart";
import {Separator} from "@/components/ui/separator";
import React from "react";
import {DecorationMenuProps} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";
import {DecorationFormStroke} from "@/components/relation/chart/chart-config/decoration-form-stroke";
import {DecorationFormDots} from "@/components/relation/chart/chart-config/decoration-form-dots";
import {ContextMenuLabel} from "@/components/ui/context-menu";


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
