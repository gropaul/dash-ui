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
 * Keeps the page off the half-way views between the viewer and the text below it (id `below`): a scroll into the space
 * between them goes on at once, smoothly, in its direction, to the text's start under the sticky header or to the top.
 * Wheel and touch input is swallowed during the glide and until it stops (trackpad momentum), as it would cut the glide
 * off or start another back.
 */
export function SnapViewerAndText({below}: { below: string }) {
    useEffect(() => {
        let lastY = window.scrollY;
        let target: number | undefined;
        let lastInput = 0;
        let started = 0;
        let release: ReturnType<typeof setTimeout> | undefined;

        const textTop = () => {
            const text = document.getElementById(below);
            const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
            return text ? text.getBoundingClientRect().top + window.scrollY - header : undefined;
        };
        // Ends the glide once it has arrived and the input has been quiet for a moment, or after a while in any case: a
        // key press can stop it short of its target.
        const releaseWhenQuiet = () => {
            clearTimeout(release);
            release = setTimeout(() => {
                if (target === undefined) return;
                const arrived = Math.abs(window.scrollY - target) < 1;
                const quiet = Date.now() - lastInput >= INPUT_QUIET_MS;
                if ((arrived && quiet) || Date.now() - started > GLIDE_LIMIT_MS) target = undefined;
                else releaseWhenQuiet();
            }, INPUT_QUIET_MS);
        };
        const onScroll = () => {
            const y = window.scrollY;
            const direction = Math.sign(y - lastY);
            lastY = y;
            if (target !== undefined) return;
            const top = textTop();
            if (top === undefined || y <= 0 || y >= top - 1 || direction === 0) return;
            target = direction > 0 ? top : 0;
            started = Date.now();
            window.scrollTo({top: target, behavior: 'smooth'});
            releaseWhenQuiet();
        };
        const onInput = (e: Event) => {
            if (target === undefined) return;
            lastInput = Date.now();
            e.preventDefault();
        };
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('wheel', onInput, {passive: false});
        window.addEventListener('touchmove', onInput, {passive: false});
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('wheel', onInput);
            window.removeEventListener('touchmove', onInput);
            clearTimeout(release);
        };
    }, [below]);
    return null;
}

const INPUT_QUIET_MS = 150;
const GLIDE_LIMIT_MS = 2000;
