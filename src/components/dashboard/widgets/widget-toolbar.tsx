import {Fragment, ReactNode} from "react";
import {GripHorizontal, Maximize, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewRunButton} from "@/components/relation/settings/relation-view-run-button";
import {TaskExecutionState} from "@/model/relation-state";
import {cn} from "@/lib/utils";

/**
 * Vertical floating toolbar for a dashboard widget. Every button is optional — it is only rendered
 * when its input is provided (text widgets pass just `onRemove`, relations pass run + fullscreen
 * too). In read-only dashboards only the run button is passed, so it stays available. Sits at a
 * widget's top-right so it needs no space above it.
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

const Divider = () => <div className="h-[1px] w-10 bg-border"/>;

export function WidgetToolbar({className, draggable, runState, onRun, onStopRun, onFullscreen, onRemove}: WidgetToolbarProps) {
    const showRun = !!(onRun && onStopRun && runState);

    // Each button keyed by name; a `false` value means its input wasn't provided and it's filtered out.
    const buttons: Record<string, ReactNode> = {
        drag: draggable && (
            <span className="widget-drag-handle w-10 h-10 flex items-center justify-center cursor-move hover:bg-accent"
                  title="Drag widget">
                <GripHorizontal className="w-4 h-4"/>
            </span>
        ),
        run: showRun && (
            <RelationViewRunButton runState={runState!} onRun={onRun!} onStopRun={onStopRun!}/>
        ),
        fullscreen: onFullscreen && (
            <Button variant="ghost" size="icon" className="rounded-[0px] w-10 h-10"
                    onClick={onFullscreen} title="Edit fullscreen">
                <Maximize className="w-4 h-4"/>
            </Button>
        ),
        delete: onRemove && (
            <Button variant="ghost" size="icon" className="rounded-[0px] w-10 h-10 hover:text-destructive"
                    onClick={onRemove} title="Remove widget">
                <X className="w-4 h-4"/>
            </Button>
        ),
    };

    // Fixed display order; filtered down to the buttons actually present.
    const order = ["drag", "run", "fullscreen", "delete"];
    const visible = order.filter(key => buttons[key]);

    if (visible.length === 0) return null;

    return (
        <>
            {/* Invisible hover trigger: a strip the height of the widget (`h-full`), sitting just
                to its right. Because it's only as tall as the widget it never extends below a short
                widget, so hovering the empty space beneath the widget won't reveal the toolbar. It
                sits below the toolbar in the stack (no z-index), so once the toolbar is shown its
                buttons still receive the clicks. */}
            <div aria-hidden className="absolute top-0 left-full h-full w-12"/>
            {/* The toolbar is `pointer-events-none` until the group is hovered, so its own overflow
                below a short widget can't trigger `group-hover` — the strip above is the only
                trigger. Once shown it becomes interactive (buttons below the widget line stay
                clickable). The `pl-2` is a transparent bridge so the pointer never crosses a dead
                zone between the widget and the toolbar. */}
            <div className={cn("pl-2 pointer-events-none group-hover/widget:pointer-events-auto", className)}>
                {/* `overflow-hidden` clips the square buttons to the rounded corners, so the first
                    and last items look right without any per-button rounding. */}
                <div className="flex flex-col items-center bg-background border rounded-2xl shadow-sm overflow-hidden">
                    {visible.map((key, i) => (
                        <Fragment key={key}>
                            {i > 0 && <Divider/>}
                            {buttons[key]}
                        </Fragment>
                    ))}
                </div>
            </div>
        </>
    );
}
