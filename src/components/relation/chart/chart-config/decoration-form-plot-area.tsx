import {DecorationMenuProps} from "@/components/relation/chart/chart-config/data-axis-decoration-menu";
import {DecorationFormDots} from "@/components/relation/chart/chart-config/decoration-form-dots";
import {DotsDecoration, FillDecoration, LineAxisDecoration} from "@/model/relation-view-state/chart";
import {DecorationFormStroke} from "@/components/relation/chart/chart-config/decoration-form-stroke";
import {Separator} from "@/components/ui/separator";
import {DecorationFormFill} from "@/components/relation/chart/chart-config/decoration-form-fill";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";


export function DecorationFormPlotArea({decoration, setDecoration}: DecorationMenuProps) {
    const scatter = decoration.scatter;
    const area = decoration.area;
    const line = decoration.line;

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
    }

    const updateFill = (fill: FillDecoration) => {
        setDecoration({
            ...decoration,
            area: {
                ...area,
                fill: fill
            },
        });
    };

    const updateAreaStroke = (partial: LineAxisDecoration["stroke"]) => {
        setDecoration({
            ...decoration,
            line: {
                ...decoration.line,
                stroke: {
                    ...decoration.line.stroke,
                    ...partial,
                },
            },
            color: partial.color,
        });
    };

    const updateSmooth = (smooth: boolean) => {
        setDecoration({
            ...decoration,
            line: {
                ...decoration.line,
                smooth: smooth,
            },
        });
    };

    return (
        <>
            <DecorationFormStroke
                stroke={line.stroke}
                updateStroke={updateAreaStroke}
            />

            <div className="px-2 py-1.5 flex items-center justify-between w-full">
                <Label>Smooth Line</Label>
                <Switch
                    checked={line.smooth}
                    onCheckedChange={updateSmooth}
                />
            </div>

            <Separator className="my-2"/>

            {/* Dots */}
            <DecorationFormDots
                alwaysShowDots={false}
                dots={scatter.dots}
                setDots={updateDots}
            />
            <Separator className="my-2"/>

            {/* Fill */}
            <DecorationFormFill
                fill={area.fill}
                setFill={updateFill}
            />
        </>
    );
}
