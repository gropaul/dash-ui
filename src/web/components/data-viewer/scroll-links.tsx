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

/**
 * Keeps the page off the half-way views between the viewer and the text below it (id `below`): a scroll that stops
 * between the two goes on, smoothly, in its direction, to the text's start under the sticky header or to the top.
 */
export function SnapViewerAndText({below}: { below: string }) {
    useEffect(() => {
        let lastY = window.scrollY;
        let direction = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const settle = () => {
            const text = document.getElementById(below);
            if (!text) return;
            const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
            const textTop = text.getBoundingClientRect().top + window.scrollY - header;
            const y = window.scrollY;
            if (y <= 0 || y >= textTop - 1) return;
            window.scrollTo({top: direction > 0 ? textTop : 0, behavior: 'smooth'});
        };
        const onScroll = () => {
            const y = window.scrollY;
            if (y !== lastY) direction = Math.sign(y - lastY);
            lastY = y;
            clearTimeout(timer);
            // After the scroll and its momentum end: a smooth scroll started during it would be cut off.
            timer = setTimeout(settle, 120);
        };
        window.addEventListener('scroll', onScroll, {passive: true});
        return () => {
            window.removeEventListener('scroll', onScroll);
            clearTimeout(timer);
        };
    }, [below]);
    return null;
}
