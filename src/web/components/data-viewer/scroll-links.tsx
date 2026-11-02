'use client';

import {ArrowDown, ArrowUp} from "lucide-react";
import {cn} from "@/lib/utils";

// The viewer fills the window and keeps the scroll inside it, so these move between it and the text below it.

/** Scrolls down to the page's "How it works" (id `how`); a plain link to it without JavaScript. */
export function LearnHowLink({className}: { className?: string }) {
    return (
        <a href="#how" className={cn("items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground", className)}
           onClick={e => {
               e.preventDefault();
               document.getElementById('how')?.scrollIntoView({behavior: 'smooth'});
           }}>
            Learn how it works
            <ArrowDown className="h-3.5 w-3.5"/>
        </a>
    );
}

/** Scrolls back up to the viewer, at the top of the page. */
export function BackToViewerLink() {
    return (
        <a href="#" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
           onClick={e => {
               e.preventDefault();
               window.scrollTo({top: 0, behavior: 'smooth'});
           }}>
            Back to the viewer
            <ArrowUp className="h-3.5 w-3.5"/>
        </a>
    );
}
