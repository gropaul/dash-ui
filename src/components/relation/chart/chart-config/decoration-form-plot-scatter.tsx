import {DotsDecoration} from "@/model/relation-view-state/chart";
import React from "react";
import {DecorationMenuProps} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";
import {DecorationFormDots} from "@/components/relation/chart/chart-config/decoration-form-dots";


export function DecorationFormPlotScatter({decoration, setDecoration}: DecorationMenuProps) {
    const line = decoration.scatter;


    const updateDots = (partial: Partial<DotsDecoration>) => {
        setDecoration({
            ...decoration,
            scatter: {
                dots: {
                    ...line.dots,
                    ...partial,
                },
            },
            color: partial.fill ?? decoration.color,
        });
    };

    return (
        <>

            {/* Dots Group */}
            <DecorationFormDots
                alwaysShowDots={true}

                dots={line.dots}
                setDots={updateDots}
            />

        </>
    );
}
