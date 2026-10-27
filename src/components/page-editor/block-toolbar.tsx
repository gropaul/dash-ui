import {Fragment, ReactNode, Ref} from "react";
import {GripVertical, Maximize, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewRunButton} from "@/components/relation/settings/relation-view-run-button";
import {TaskExecutionState} from "@/model/relation-state";
import {cn} from "@/lib/utils";
import {Separator} from "@/components/ui/separator";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";

/**
 * Horizontal floating toolbar for a page block. Every button is optional — it is only rendered when its
 * input is provided (text blocks pass just `onRemove`, relation blocks pass run + fullscreen too). The
 * caller positions it centered just above the block's top edge.
 *
 * The grip, shown only when `draggable`, is the drag handle; the drag source attaches through
 * `dragHandleRef`. `menu` is an extra button slot after the grip, e.g. a dropdown trigger.
 */
interface BlockToolbarProps {
    className?: string;
    draggable?: boolean;
    dragHandleRef?: Ref<HTMLSpanElement>;
    menu?: ReactNode;
    runState?: TaskExecutionState;
    onRun?: () => void;
    onStopRun?: () => void;
    onFullscreen?: () => void;
    onRemove?: () => void;
}

export function BlockToolbar({className, draggable, dragHandleRef, menu, runState, onRun, onStopRun, onFullscreen, onRemove}: BlockToolbarProps) {
    const showRun = !!(onRun && onStopRun && runState);

    // Each button keyed by name; a `false` value means its input wasn't provided and it's filtered out.
    const buttons: Record<string, ReactNode> = {
        drag: draggable && (
            <TooltipWrapper message="Drag block">
                <span ref={dragHandleRef} className="w-10 h-10 flex items-center justify-center cursor-move hover:bg-accent">
                    <GripVertical className="w-4 h-4"/>
                </span>
            </TooltipWrapper>
        ),
        menu: menu,
        run: showRun && (
            <RelationViewRunButton runState={runState!} onRun={onRun!} onStopRun={onStopRun!}/>
        ),
        fullscreen: onFullscreen && (
            <TooltipWrapper message="Open View">
                <Button variant="ghost" size="icon" aria-label="Open view" className="rounded-[0px] w-10 h-10"
                        onClick={onFullscreen}>
                    <Maximize className="w-4 h-4"/>
                </Button>
            </TooltipWrapper>
        ),
        delete: onRemove && (
            <TooltipWrapper message="Remove block">
                <Button variant="ghost" size="icon" aria-label="Remove block" className="rounded-[0px] w-10 h-10 hover:text-destructive"
                        onClick={onRemove}>
                    <X className="w-4 h-4"/>
                </Button>
            </TooltipWrapper>
        ),
    };

    // Fixed display order; filtered down to the buttons actually present.
    const order = ["drag", "menu", "run", "fullscreen", "delete"];
    const visible = order.filter(key => buttons[key]);

    if (visible.length === 0) return null;

    // Not interactive until the caller shows it (`pointer-events-auto` in `className`). `pb-0.5` is a
    // transparent gap above the block: the bar floats up while its element still touches the block's top
    // edge, so the pointer never crosses a dead zone that would drop the block's hover.
    // `overflow-hidden` clips the square buttons to the rounded corners.
    return (
        <div className={cn("pointer-events-none pb-0.5", className)}>
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
