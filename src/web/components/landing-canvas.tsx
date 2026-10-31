'use client';

import {RefObject, useEffect, useRef} from "react";
import {ReactFlowProvider, useReactFlow} from "@xyflow/react";
import {Flow} from "@/components/canvas/flow";
import {useBlockFullscreen} from "@/components/page-editor/block-fullscreen";
import {Loader2} from "lucide-react";
import {openSiteFile, SiteSnapshot, useStartDatabaseWhenIdle, useWaitingForDatabase} from "@web/components/site-runtime";
import {LANDING_BOUNDS, LANDING_CANVAS, landingSetup} from "@web/components/landing";
import canvasText from "@web/components/landing.canvas?raw";
import snapshot from "@web/components/landing-snapshot.json";

// Once, before the canvas renders, which reads the stores; not while rendering (see live-dashboard.tsx).
openSiteFile(LANDING_CANVAS, canvasText, landingSetup(), snapshot as unknown as SiteSnapshot);

/**
 * The landing page's canvas, live: shown from its snapshot first, with DuckDB starting once the page is idle. It covers
 * its whole parent, and its nodes, as the file places them, fill `box`: dragged past it, they stay on the canvas.
 */
export default function LandingCanvas({box, onShown}: { box: RefObject<HTMLElement | null>, onShown: () => void }) {
    const openFullscreen = useBlockFullscreen(s => s.open);
    const pane = useRef<HTMLDivElement>(null);
    const waiting = useWaitingForDatabase();

    useStartDatabaseWhenIdle();

    return (
        <ReactFlowProvider>
            <div ref={pane} className="h-full w-full">
                <Flow canvasId={LANDING_CANVAS} openFullscreen={openFullscreen} embedded/>
            </div>
            <FitToBox pane={pane} box={box} onFit={onShown}/>
            {waiting && (
                <div role="status" className="absolute bottom-2 right-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin"/>
                    Loading DuckDB…
                </div>
            )}
        </ReactFlowProvider>
    );
}

/** Keeps the view where the canvas's nodes fill `box`, a part of `pane`, as the window resizes; `onFit` after each fit. */
function FitToBox({pane, box, onFit}: { pane: RefObject<HTMLElement | null>, box: RefObject<HTMLElement | null>, onFit: () => void }) {
    const {setViewport} = useReactFlow();

    useEffect(() => {
        const {x, y, width} = LANDING_BOUNDS;
        const fit = () => {
            if (!pane.current || !box.current) return;
            const outer = pane.current.getBoundingClientRect();
            const inner = box.current.getBoundingClientRect();
            const zoom = inner.width / width;
            void setViewport({x: inner.left - outer.left - x * zoom, y: inner.top - outer.top - y * zoom, zoom});
            onFit();
        };
        fit();
        const observer = new ResizeObserver(fit);
        if (pane.current) observer.observe(pane.current);
        if (box.current) observer.observe(box.current);
        return () => observer.disconnect();
    }, [pane, box, onFit, setViewport]);

    return null;
}
