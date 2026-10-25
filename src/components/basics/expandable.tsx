import React, {useState} from "react";
import {cn} from "@/lib/utils";

/**
 * Content that slides open and closed: a transition of the grid row from 0fr to 1fr, which picks up from the
 * current height, so a quick reopen reverses instead of restarting. Rendered only while open or closing.
 */
export function Expandable({open, className, children}: { open: boolean, className?: string, children: React.ReactNode }) {
    const [closing, setClosing] = useState(false);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        setClosing(!open);
    }
    return (
        <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
             onTransitionEnd={e => e.target === e.currentTarget && setClosing(false)}>
            <div className={cn("min-h-0 overflow-hidden", className)}>
                {(open || closing) && children}
            </div>
        </div>
    );
}
