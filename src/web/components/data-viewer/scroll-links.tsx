'use client';

import {useEffect, useState} from "react";
import {ArrowDown, ArrowUp} from "lucide-react";
import {cn} from "@/lib/utils";

// The viewer fills the window and keeps the scroll inside it, so these move between it and the text below it.

/**
 * Scrolls down to the page's "How it works" (id `how`); a plain link to it without JavaScript. Scrolled past half the
 * window, it leads back up to the viewer, its arrow turning over with a small overshoot.
 */
export function LearnHowLink({className}: { className?: string }) {
    const [down, setDown] = useState(false);
    useEffect(() => {
        const update = () => setDown(window.scrollY > window.innerHeight / 2);
        update();
        window.addEventListener('scroll', update, {passive: true});
        return () => window.removeEventListener('scroll', update);
    }, []);
    return (
        <a href={down ? "#" : "#how"} className={cn("items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground", className)}
           onClick={e => {
               e.preventDefault();
               if (down) window.scrollTo({top: 0, behavior: 'smooth'});
               else document.getElementById('how')?.scrollIntoView({behavior: 'smooth'});
           }}>
            {down ? 'Back to the file' : 'How it works'}
            <ArrowDown className={cn("h-3.5 w-3.5 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.8,0.64,1)]", down && "rotate-180")}/>
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
            Back to the file
            <ArrowUp className="h-3.5 w-3.5"/>
        </a>
    );
}
