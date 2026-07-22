import {Fragment, ReactNode} from "react";
import {GripHorizontal, GripVertical, Maximize, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewRunButton} from "@/components/relation/settings/relation-view-run-button";
import {TaskExecutionState} from "@/model/relation-state";
import {cn} from "@/lib/utils";
import {Separator} from "@/components/ui/separator";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";

/**
 * Horizontal floating toolbar for a dashboard widget. Every button is optional — it is only rendered
 * when its input is provided (text widgets pass just `onRemove`, relations pass run + fullscreen
 * too). In read-only dashboards only the run button is passed, so it stays available. The caller
 * positions it centered just above the widget's top edge.
 *
 * `.widget-drag-handle` (the grip) is the RGL drag handle, shown only when `draggable`.
 */
interface WidgetToolbarProps {
    className?: string;
    draggable?: boolean;
    runState?: TaskExecutionState;
    onRun?: () => void;
    onStopRun?: () => void;
    onFullscreen?: () => void;
    onRemove?: () => void;
}

export function WidgetToolbar({className, draggable, runState, onRun, onStopRun, onFullscreen, onRemove}: WidgetToolbarProps) {
    const showRun = !!(onRun && onStopRun && runState);

    // Each button keyed by name; a `false` value means its input wasn't provided and it's filtered out.
    const buttons: Record<string, ReactNode> = {
        drag: draggable && (
            <TooltipWrapper message="Drag widget">
                <span className="widget-drag-handle w-10 h-10 flex items-center justify-center cursor-move hover:bg-accent">
                    <GripVertical className="w-4 h-4"/>
                </span>
            </TooltipWrapper>
        ),
        run: showRun && (
            <RelationViewRunButton runState={runState!} onRun={onRun!} onStopRun={onStopRun!}/>
        ),
        fullscreen: onFullscreen && (
            <TooltipWrapper message="Open relation">
                <Button variant="ghost" size="icon" className="rounded-[0px] w-10 h-10"
                        onClick={onFullscreen}>
                    <Maximize className="w-4 h-4"/>
                </Button>
            </TooltipWrapper>
        ),
        delete: onRemove && (
            <TooltipWrapper message="Remove widget">
                <Button variant="ghost" size="icon" className="rounded-[0px] w-10 h-10 hover:text-destructive"
                        onClick={onRemove}>
                    <X className="w-4 h-4"/>
                </Button>
            </TooltipWrapper>
        ),
    };

    // Fixed display order; filtered down to the buttons actually present.
    const order = ["drag", "run", "fullscreen", "delete"];
    const visible = order.filter(key => buttons[key]);

    if (visible.length === 0) return null;

    // The toolbar sits directly on the widget's top edge (no gap), so it's a DOM descendant of the
    // hover group and the pointer can travel from the widget into it without ever leaving the group.
    // It's `pointer-events-none` until the group is hovered, then becomes interactive.
    return (
        <div className={cn("pointer-events-none group-hover/widget:pointer-events-auto pb-1", className)}>
            {/* `pb-1.5` on this wrapper is a transparent gap above the widget — the visible bar floats
                up while the element still touches the widget's top edge, so the pointer never crosses
                a dead zone that would drop `group-hover`.
                `overflow-hidden` clips the square buttons to the rounded corners, so the first
                and last items look right without any per-button rounding. */}
            <div className="flex flex-row items-center bg-background border rounded-2xl shadow-sm overflow-hidden">
                {visible.map((key, i) => (
                    <Fragment key={key}>
                        {i > 0 && <Separator orientation={'vertical'} className="h-10"/>}
                        {buttons[key]}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
