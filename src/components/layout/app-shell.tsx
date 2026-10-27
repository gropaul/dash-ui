'use client';

import React from "react";
import {NavigationSidebar} from "@/components/layout/navigation-sidebar";
import {AppBar} from "@/components/layout/app-bar";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {AgentChatPanel} from "@/components/agent-chat/agent-chat-panel";
import {useAgentPanelShown} from "@/components/agent-chat/agent-panel-shown";

/**
 * Router-driven shell. The full-height left navigation sidebar (holds the logo), then the
 * AppBar (workspace path breadcrumb + actions) above the routed view in <main>, with the agent chat
 * panel on the right, resizable against <main>. The routed page is passed as `children`; whether the
 * sidebar is expanded stays UI-only state, orthogonal to the route.
 */
export function AppShell({children}: { children: React.ReactNode }) {
    return (
        <div className="relative h-full w-full flex flex-row">
            <NavigationSidebar/>
            <div className="flex flex-col h-full flex-1 min-w-0">
                <AppBar/>
                <ContentWithAgentPanel>{children}</ContentWithAgentPanel>
            </div>
        </div>
    );
}

function ContentWithAgentPanel({children}: { children: React.ReactNode }) {
    const shown = useAgentPanelShown();
    if (!shown) return <MainArea>{children}</MainArea>;
    return (
        <ResizablePanelGroup direction="horizontal" autoSaveId="agent-panel" className="flex-1 min-h-0 min-w-0">
            <ResizablePanel defaultSize={70} minSize={30}>
                <MainArea>{children}</MainArea>
            </ResizablePanel>
            <ResizableHandle className="!cursor-col-resize"/>
            <ResizablePanel defaultSize={30} minSize={20}>
                <AgentChatPanel/>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

function MainArea({children}: { children: React.ReactNode }) {
    return <main className="h-full flex-1 min-h-0 min-w-0 relative overflow-auto">{children}</main>;
}
