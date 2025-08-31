import React from "react";

// shadcn/ui (or your own components)
import {AxisDecoration, PlotType,} from "@/model/relation-view-state/chart";

import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {DecorationFormPlotLine} from "@/components/relation/chart/chart-config/decoration-form-plot-line";
import {DecorationFormPlotArea} from "@/components/relation/chart/chart-config/decoration-form-plot-area";
import {DecorationFormPlotScatter} from "@/components/relation/chart/chart-config/decoration-form-plot-scatter";
import {DecorationFormPlotBar} from "@/components/relation/chart/chart-config/decoration-form-plot-bar";

/* -------------------------------------------------------------------------- */
/* Interface definitions */
/* -------------------------------------------------------------------------- */

export interface DecorationMenuProps {
    plotType: PlotType;
    decoration: AxisDecoration;
    setDecoration: (decoration: AxisDecoration) => void;
}

export function DataAxisDecorationMenu(props: DecorationMenuProps) {
    const {decoration} = props;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                {/* Series-level color swatch */}
                <div
                    className="inline-block bg-white rounded-sm shadow border border-gray-300 cursor-pointer h-4 w-4"
                    style={{
                        background: decoration.color,
                    }}
                />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 text-sm">
                {/* Submenu for main series color */}

                <ChartSpecificDecoration {...props} />

            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Chooses which sub-menu to show based on `plotType`.
 */
export function ChartSpecificDecoration(props: DecorationMenuProps) {
    const {plotType} = props;
    switch (plotType) {
        case "scatter":
            return <DecorationFormPlotScatter {...props} />;
        case "line":
            return <DecorationFormPlotLine {...props} />;
        case "area":
            return <DecorationFormPlotArea {...props} />;
        case "bar":
            return <DecorationFormPlotBar {...props} />;
        case "radar":
            return <DecorationFormPlotArea {...props} />;
        default:
            return null;
    }
}


