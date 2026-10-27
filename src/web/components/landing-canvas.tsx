'use client';

import {useEffect, useState} from "react";
import {ReactFlowProvider} from "@xyflow/react";
import {Flow} from "@/components/canvas/flow";
import {useBlockFullscreen} from "@/components/page-editor/block-relation";
import {CanvasSnapshot, openSiteCanvas, startDatabase, takeSnapshot} from "@web/components/site-runtime";
import {LANDING_CANVAS} from "@web/components/landing";
import canvasText from "@web/components/landing.canvas?raw";
import snapshot from "@web/components/landing-snapshot.json";

// `?fresh` (e2e builds only) runs every query instead of showing the snapshot, so a new one can be taken.
const fresh = () => process.env.NEXT_PUBLIC_E2E === '1' && new URLSearchParams(window.location.search).has('fresh');

/** The landing page's canvas, live: shown from its snapshot first, with DuckDB starting once the page is idle. */
export default function LandingCanvas({onShown}: { onShown: () => void }) {
    // Before the canvas renders, which reads the stores.
    useState(() => openSiteCanvas(LANDING_CANVAS, canvasText, fresh() ? undefined : snapshot as unknown as CanvasSnapshot));
    const openFullscreen = useBlockFullscreen(s => s.open);

    useEffect(() => {
        if (process.env.NEXT_PUBLIC_E2E === '1') {
            (window as unknown as { __dashSiteSnapshot?: () => CanvasSnapshot }).__dashSiteSnapshot = () => takeSnapshot(LANDING_CANVAS);
        }
        const frame = requestAnimationFrame(() => requestAnimationFrame(onShown));
        const idle = requestIdleCallback(() => void startDatabase(), {timeout: 4000});
        return () => {
            cancelAnimationFrame(frame);
            cancelIdleCallback(idle);
        };
    }, [onShown]);

    return (
        <ReactFlowProvider>
            <Flow canvasId={LANDING_CANVAS} openFullscreen={openFullscreen} embedded/>
        </ReactFlowProvider>
    );
}
