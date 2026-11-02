import React from "react";
import {cn} from "@/lib/utils";

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 480;

/**
 * The right edge of a sidebar: dragging it reports each width through `onDrag`, and the last one through `onEnd`
 * once the drag ends, so the caller saves it once. `onDrag(undefined)` closes the drag.
 */
export function SidebarResizeHandle({width, onDrag, onEnd, className}: {
    width: number;
    className?: string;
    onDrag: (width: number | undefined) => void;
    onEnd: (width: number) => void;
}) {
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        const handle = e.currentTarget;
        const startX = e.clientX;
        let last = width;
        const onMove = (ev: PointerEvent) => {
            last = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width + ev.clientX - startX));
            onDrag(last);
        };
        // Fires on release and on a cancelled drag alike.
        const end = () => {
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('lostpointercapture', end);
            onEnd(last);
            onDrag(undefined);
        };
        handle.setPointerCapture(e.pointerId);
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('lostpointercapture', end);
    };
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={onPointerDown}
            className={cn("absolute inset-y-0 right-0 w-1 cursor-col-resize transition-colors hover:bg-border active:bg-border", className)}
        />
    );
}
