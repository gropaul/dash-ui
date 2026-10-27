'use client';

import React, {CSSProperties, useCallback, useState, useSyncExternalStore} from "react";
import dynamic from "next/dynamic";
import {cn} from "@/lib/utils";

const LandingCanvas = dynamic(() => import("@web/components/landing-canvas"), {ssr: false});

// Below this width the canvas is too small to use; the page keeps its text and links.
const CANVAS_MEDIA = '(min-width: 768px)';

function subscribeToWidth(onChange: () => void) {
    const media = window.matchMedia(CANVAS_MEDIA);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

/**
 * The landing canvas, in the page's content width and at the canvas's own proportions (`aspect`, width / height),
 * on a dotted ground that runs out to the window's edges. `children`, its static copy, shows until the live canvas
 * has loaded over it. On a phone, `phone` shows below the copy's text in place of the canvas.
 */
export function Hero({aspect, children, phone}: { aspect: number, children: React.ReactNode, phone: React.ReactNode }) {
    // False while hydrating, as on the server; the canvas mounts right after.
    const live = useSyncExternalStore(subscribeToWidth, () => window.matchMedia(CANVAS_MEDIA).matches, () => false);
    const [shown, setShown] = useState(false);
    const onShown = useCallback(() => setShown(true), []);

    return (
        <section className="landing-dots border-b">
            <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
                <div className="relative md:aspect-[var(--canvas-aspect)]" style={{'--canvas-aspect': aspect} as CSSProperties}>
                    <div className={cn("h-full transition-opacity duration-500", shown && "pointer-events-none opacity-0")}>
                        {children}
                    </div>
                    <div className="mt-8 md:hidden">{phone}</div>
                    <div className={cn("absolute inset-0 transition-opacity duration-500", shown ? "opacity-100" : "pointer-events-none opacity-0")}>
                        {live && <LandingCanvas onShown={onShown}/>}
                    </div>
                </div>
            </div>
        </section>
    );
}
