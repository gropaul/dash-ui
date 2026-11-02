'use client';

import {useEffect, useState} from "react";
import {Loader2} from "lucide-react";

type ToolComponent = typeof import("@web/components/data-viewer/data-viewer-tool").default;
let toolModule: Promise<ToolComponent> | undefined;
const loadTool = () => toolModule ??= import("@web/components/data-viewer/data-viewer-tool").then(m => m.default);
// Fetched while the page hydrates; not next/dynamic, as on the landing page (hero.tsx).
if (typeof window !== 'undefined') void loadTool();

/** The data viewer, loaded after the page's HTML: it brings DuckDB's client and the relation view. */
export function DataViewer() {
    const [Tool, setTool] = useState<ToolComponent>();
    useEffect(() => {
        void loadTool().then(tool => setTool(() => tool));
    }, []);

    if (Tool) return <Tool/>;
    return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
            Loading the viewer…
        </div>
    );
}
