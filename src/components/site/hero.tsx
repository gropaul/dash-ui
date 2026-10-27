'use client';

import React, {useCallback, useState, useSyncExternalStore} from "react";
import dynamic from "next/dynamic";
import {cn} from "@/lib/utils";

const LandingCanvas = dynamic(() => import("@/components/site/landing-canvas"), {ssr: false});

// Below this width the canvas is too small to use; the page keeps its text and links.
const CANVAS_MEDIA = '(min-width: 768px)';

function subscribeToWidth(onChange: () => void) {
    const media = window.matchMedia(CANVAS_MEDIA);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

/**
 * The landing canvas: `children`, its static copy, until the live canvas has loaded over it. On a phone, `phone` shows
 * below the copy's text in place of the canvas.
 */
export function Hero({children, phone}: { children: React.ReactNode, phone: React.ReactNode }) {
    // False while hydrating, as on the server; the canvas mounts right after.
    const live = useSyncExternalStore(subscribeToWidth, () => window.matchMedia(CANVAS_MEDIA).matches, () => false);
    const [shown, setShown] = useState(false);
    const onShown = useCallback(() => setShown(true), []);

    return (
        <section className="relative border-b px-4 py-10 md:h-[min(86vh,860px)] md:p-0 md:[container-type:size]">
            <div className={cn("flex h-full items-center justify-center transition-opacity duration-500", shown && "pointer-events-none opacity-0")}>
                {children}
            </div>
            <div className="mt-8 md:hidden">{phone}</div>
            <div className={cn("absolute inset-0 transition-opacity duration-500", shown ? "opacity-100" : "pointer-events-none opacity-0")}>
                {live && <LandingCanvas onShown={onShown}/>}
            </div>
        </section>
    );
}
