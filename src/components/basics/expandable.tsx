import React, {useState} from "react";
import {cn} from "@/lib/utils";

/**
 * Content that slides open and closed: a transition of the grid row from 0fr to 1fr, which picks up from the
 * current height, so a quick reopen reverses instead of restarting. Rendered only while open or closing.
 * Clipped only while it moves or is closed, so shadows and focus rings of the content show once it is open.
 */
export function Expandable({open, className, children}: { open: boolean, className?: string, children: React.ReactNode }) {
    const [moving, setMoving] = useState(false);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        setMoving(true);
    }
    return (
        <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
             onTransitionEnd={e => e.target === e.currentTarget && setMoving(false)}>
            <div className={cn("min-h-0", (moving || !open) && "overflow-hidden", className)}>
                {(open || moving) && children}
            </div>
        </div>
    );
}
