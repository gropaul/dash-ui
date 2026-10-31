'use client';

import React, {CSSProperties, useCallback, useEffect, useRef, useState, useSyncExternalStore} from "react";
import {cn} from "@/lib/utils";
import {MOBILE_BREAKPOINT_PX} from "@/platform/global-data";
import {LANDING_BOUNDS, useCanvasDone} from "@web/components/landing";

// Below this width the canvas is too small to use; the page shows `phone` instead.
const CANVAS_MEDIA = `(min-width: ${MOBILE_BREAKPOINT_PX}px)`;

type LandingCanvasComponent = typeof import("@web/components/landing-canvas").default;
let canvasModule: Promise<LandingCanvasComponent> | undefined;
const loadCanvas = () => canvasModule ??= import("@web/components/landing-canvas").then(m => m.default);
// Not next/dynamic: React holds back content behind Suspense until 300ms after its fallback showed. Fetched while
// the page hydrates.
if (typeof window !== 'undefined' && window.matchMedia(CANVAS_MEDIA).matches) void loadCanvas();

function subscribeToWidth(onChange: () => void) {
    const media = window.matchMedia(CANVAS_MEDIA);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

/**
 * The landing canvas: its nodes fill a box in the page's content width at the canvas's own proportions, while the
 * canvas itself runs out to the hero's edges on a dotted ground, so nothing is cut at the box. On a phone, `phone`
 * shows instead; it is in the page's HTML on every screen.
 */
export function Hero({phone}: { phone: React.ReactNode }) {
    // False while hydrating, as on the server; the canvas mounts right after.
    const live = useSyncExternalStore(subscribeToWidth, () => window.matchMedia(CANVAS_MEDIA).matches, () => false);
    const [shown, setShown] = useState(false);
    const onShown = useCallback(() => {
        console.log('[landing] canvas shown');
        setShown(true);
        useCanvasDone.setState(true, true);
    }, []);
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => console.log('[landing] wide', live, window.innerWidth, window.devicePixelRatio), [live]);
    const [LandingCanvas, setLandingCanvas] = useState<LandingCanvasComponent>();
    useEffect(() => {
        if (live) void loadCanvas().then(canvas => setLandingCanvas(() => canvas));
    }, [live]);

    return (
        <section className="landing-dots relative border-b bg-background">
            {/* What the page is about, for search engines and screen readers; the canvas's title is the visible one. */}
            <h1 className="sr-only">Canvases and Dashboards using DuckDB</h1>
            <div className="mx-auto max-w-6xl px-4 py-5 md:py-8 lg:py-12 2xl:py-14">
                <div ref={box} className="relative md:aspect-[var(--canvas-aspect)]" style={{'--canvas-aspect': LANDING_BOUNDS.width / LANDING_BOUNDS.height} as CSSProperties}>
                    <div className="md:hidden">{phone}</div>
                </div>
            </div>
            <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-150", shown ? "opacity-100" : "pointer-events-none opacity-0")}>
                {live && LandingCanvas && <LandingCanvas box={box} onShown={onShown}/>}
            </div>
        </section>
    );
}
