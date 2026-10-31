'use client';

import {useEffect} from "react";
import dynamic from "next/dynamic";
import dashboardText from "@web/components/landing-dashboard.md?raw";
import {useCanvasDone} from "@web/components/landing";

// The page editor loads only for this section, once the canvas has shown, so never on a phone, where DuckDB and the
// editor together are too much; the page's HTML has its text meanwhile.
const LiveDashboard = dynamic(() => import("@web/components/live-dashboard"), {ssr: false, loading: Loading});

// Shown as well when the import fails, which next/dynamic otherwise keeps quiet.
function Loading({error}: { error?: Error | null }) {
    useEffect(() => {
        if (error) console.error('The live dashboard failed to load', error);
    }, [error]);
    return <DashboardText/>;
}

/** The landing page's dashboard, live in the page editor, in a frame like the app's. */
export function DashboardDemo() {
    const canvasDone = useCanvasDone();
    return (
        <div className="h-[640px] overflow-hidden rounded-2xl border bg-background shadow-[var(--node-shadow)]">
            {canvasDone ? <LiveDashboard/> : <DashboardText/>}
        </div>
    );
}

/** The dashboard's heading and text, before the editor has loaded. */
function DashboardText() {
    const [heading, ...paragraphs] = dashboardText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !p.startsWith('```'));
    return (
        <div className="mx-auto max-w-5xl px-12 pt-8">
            <h2 className="text-3xl font-bold tracking-tight">{heading.replace(/^#+\s*/, '')}</h2>
            {paragraphs.map(p => <p key={p} className="mt-4">{p}</p>)}
        </div>
    );
}
