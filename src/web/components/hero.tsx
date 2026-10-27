'use client';

import React, {CSSProperties, useCallback, useRef, useState, useSyncExternalStore} from "react";
import dynamic from "next/dynamic";
import {cn} from "@/lib/utils";
import {LANDING_BOUNDS} from "@web/components/landing";

const LandingCanvas = dynamic(() => import("@web/components/landing-canvas"), {ssr: false});

// Below this width the canvas is too small to use; the page shows `phone` instead.
const CANVAS_MEDIA = '(min-width: 768px)';

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
    const onShown = useCallback(() => setShown(true), []);
    const box = useRef<HTMLDivElement>(null);

    return (
        <section className="landing-dots relative border-b">
            <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
                <div ref={box} className="relative md:aspect-[var(--canvas-aspect)]" style={{'--canvas-aspect': LANDING_BOUNDS.width / LANDING_BOUNDS.height} as CSSProperties}>
                    <div className="md:hidden">{phone}</div>
                </div>
            </div>
            <div className={cn("absolute inset-0 overflow-hidden transition-opacity duration-500", shown ? "opacity-100" : "pointer-events-none opacity-0")}>
                {live && <LandingCanvas box={box} onShown={onShown}/>}
            </div>
        </section>
    );
}
