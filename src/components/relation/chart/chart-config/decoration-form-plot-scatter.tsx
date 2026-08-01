import {DotsDecoration} from "@/model/relation-view-state/chart";
import React from "react";
import {DecorationMenuProps} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";
import {DecorationFormDots} from "@/components/relation/chart/chart-config/decoration-form-dots";


export function DecorationFormPlotScatter({decoration, setDecoration}: DecorationMenuProps) {
    const scatter = decoration.scatter;

    // Scatter has no stroke form of its own, so the dot fill doubles as the series color (which is
    // what draws the dot border).
    const updateDots = (partial: Partial<DotsDecoration>) => {
        setDecoration({
            ...decoration,
            scatter: {
                dots: {
                    ...scatter.dots,
                    ...partial,
                },
            },
            line: {
                ...decoration.line,
                stroke: {
                    ...decoration.line.stroke,
                    color: partial.fill ?? decoration.line.stroke.color,
                },
            },
        });
    };

    return (
        <>

            {/* Dots Group */}
            <DecorationFormDots
                alwaysShowDots={true}

                dots={scatter.dots}
                setDots={updateDots}
            />

        </>
    );
}
