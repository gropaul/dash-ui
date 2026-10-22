'use client';

import React from "react";
import {NavigationSidebar} from "@/components/layout/navigation-sidebar";
import {AppBar} from "@/components/layout/app-bar";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {AgentChatPanel, useAgentPanelShown} from "@/components/agent-chat/agent-chat-panel";
import {useGUIState} from "@/state/gui.state";

/**
 * Router-driven shell. A full-width AppBar across the top (holds the global
 * workspace path breadcrumb + future brand/search), then the left navigation
 * sidebar + the routed view in <main>. The routed page is passed as `children`;
 * whether the sidebar is expanded stays UI-only state, orthogonal to the route.
 * The agent chat panel opens on the right, resizable against <main>.
 */
export function AppShell({children}: { children: React.ReactNode }) {
    return (
        <div className="relative h-full w-full flex flex-col">
            <AppBar/>
            <div className="flex flex-row flex-1 min-h-0">
                <NavigationSidebar/>
                <ContentWithAgentPanel>{children}</ContentWithAgentPanel>
            </div>
        </div>
    );
}

function ContentWithAgentPanel({children}: { children: React.ReactNode }) {
    const shown = useAgentPanelShown();
    const setOpen = useGUIState((s) => s.setAgentPanelOpen);
    if (!shown) return <MainArea>{children}</MainArea>;
    return (
        <ResizablePanelGroup direction="horizontal" autoSaveId="agent-panel" className="flex-1 min-w-0">
            <ResizablePanel defaultSize={70} minSize={30}>
                <MainArea>{children}</MainArea>
            </ResizablePanel>
            <ResizableHandle className="!cursor-col-resize"/>
            <ResizablePanel defaultSize={30} minSize={20}>
                <AgentChatPanel onClose={() => setOpen(false)}/>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

function MainArea({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full flex-1 min-w-0">
            <main className="flex-1 min-h-0 relative overflow-auto">{children}</main>
        </div>
    );
}
