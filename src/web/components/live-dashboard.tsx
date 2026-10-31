'use client';

import {useCallback, useState} from "react";
import {PageEditor, PageEditorMode} from "@/components/page-editor/page-editor";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {openSiteFile, SiteSnapshot, useStartDatabaseWhenIdle} from "@web/components/site-runtime";
import {LANDING_DASHBOARD, landingSetup} from "@web/components/landing";
import dashboardText from "@web/components/landing-dashboard.md?raw";
import snapshot from "@web/components/landing-snapshot.json";

// Once, before the blocks render, which read the stores. Not while rendering: the canvas reads them too, and its
// re-render would cut this render short, over and over on a slow machine.
openSiteFile(LANDING_DASHBOARD, dashboardText, landingSetup(), snapshot as unknown as SiteSnapshot);

/**
 * The landing page's dashboard in the app's page editor: the page next to its markdown, each editable and each
 * updating the other.
 */
export default function LiveDashboard() {
    useStartDatabaseWhenIdle();
    const [mode, setMode] = useState<PageEditorMode>('split');
    // The blocks read each other through the page's text.
    const onMarkdownChange = useCallback((markdown: string) => {
        useWorkspace.setState(state => ({files: {...state.files, [LANDING_DASHBOARD]: markdown}}));
    }, []);

    return (
        <PageEditor path={LANDING_DASHBOARD} markdown={dashboardText} onMarkdownChange={onMarkdownChange}
                    mode={mode} onModeChange={setMode} plainMarkdownEditor markdownRight scrollPastEnd={false}/>
    );
}
