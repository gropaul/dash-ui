import {GripHorizontal, GripVertical, Maximize, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewRunButton} from "@/components/relation/settings/relation-view-run-button";
import {TaskExecutionState} from "@/model/relation-state";
import {cn} from "@/lib/utils";

/**
 * Vertical floating toolbar for a dashboard widget (edit mode). Every action is optional — a button
 * is only rendered when its handler is provided (text widgets pass just `onRemove`, relations pass
 * run + fullscreen too). Sits at a widget's top-right so it needs no space above it.
 *
 * `.widget-drag-handle` (the grip) is the RGL drag handle.
 */
interface WidgetToolbarProps {
    className?: string;
    runState?: TaskExecutionState;
    onRun?: () => void;
    onStopRun?: () => void;
    onFullscreen?: () => void;
    onRemove?: () => void;
}

const Divider = () => <div className="h-[1px] w-10 bg-border"/>;

export function WidgetToolbar({className, runState, onRun, onStopRun, onFullscreen, onRemove}: WidgetToolbarProps) {
    const showRun = !!(onRun && onStopRun && runState);
    return (
        // Outer wrapper is a transparent bridge: it sits flush against the widget's right edge (no
        // gap) and its left padding creates the visual gap — so moving the pointer from the widget
        // to the toolbar never crosses a dead zone that would drop `group-hover`.
        <div className={cn("pl-2", className)}>
            <div className="flex flex-col items-center bg-background border rounded-2xl shadow-sm">
            <span
                className="widget-drag-handle w-10 h-10 flex items-center justify-center cursor-move"
                title="Drag widget"
            >
                <GripHorizontal className="w-4 h-"/>
            </span>
            {showRun && (
                <>
                    <Divider/>
                    <RelationViewRunButton runState={runState!} onRun={onRun!} onStopRun={onStopRun!}/>
                </>
            )}
            {onFullscreen && (
                <>
                    <Divider/>
                    <Button variant="ghost" size="icon" className="rounded-[0px] w-10 h-10"
                            onClick={onFullscreen} title="Edit fullscreen">
                        <Maximize className="w-4 h-4"/>
                    </Button>
                </>
            )}
            {onRemove && (
                <>
                    <Divider/>
                    <Button variant="ghost" size="icon"
                            className="rounded-[0px] w-10 h-10 hover:text-destructive"
                            onClick={onRemove} title="Remove widget">
                        <X className="w-4 h-4"/>
                    </Button>
                </>
            )}
            </div>
        </div>
    );
}
