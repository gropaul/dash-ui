'use client';

import React from "react";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {NavigationBarContent, NavigationBarDesktop} from "@/components/layout/navigation-bar-desktop";
import {NavigationBarMobile} from "@/components/layout/navigation-bar-mobile";
import {useGUIState} from "@/state/gui.state";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {cn} from "@/lib/utils";

/**
 * Router-driven shell (replaces the flexlayout TabbedLayout). Left icon rail +
 * optional side panel + the routed view in <main>. The routed page is passed as
 * `children`; the side panel (which trees are open) stays UI-only state,
 * orthogonal to the routed content. The workspace path is shown per-view (e.g.
 * in the relation header), not as a global bar.
 */
export function AppShell({children}: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    return (
        <div className="relative h-full w-full">
            <div className="flex flex-row h-full">
                {isMobile ? <MobileLayout>{children}</MobileLayout> : <DesktopLayout>{children}</DesktopLayout>}
            </div>
        </div>
    );
}

function MainArea({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full w-full min-w-0">
            <main className="flex-1 min-h-0 relative overflow-auto">{children}</main>
        </div>
    );
}

function DesktopLayout({children}: { children: React.ReactNode }) {
    const selectedTabs = useGUIState((state) => state.selectedSidebarTabs);
    const setSelectedTabs = useGUIState((state) => state.setSelectedSidebarTabs);
    const panelRatio = useGUIState((state) => state.mainBarSizeRatio);
    const setPanelRatio = useGUIState((state) => state.setMainBarSizeRatio);

    const hasSidebar = selectedTabs.length > 0;

    return (
        <>
            <NavigationBarDesktop selectedTabs={selectedTabs} setSelectedTabs={setSelectedTabs}/>
            <ResizablePanelGroup className="flex-1 h-full" direction="horizontal">
                <ResizablePanel
                    defaultSize={panelRatio}
                    onResize={setPanelRatio}
                    minSize={8}
                    style={{display: hasSidebar ? "block" : "none"}}
                >
                    <NavigationBarContent selectedTabs={selectedTabs}/>
                </ResizablePanel>
                <ResizableHandle className={cn(hasSidebar ? "" : "hidden", "!cursor-col-resize")}/>
                <ResizablePanel defaultSize={hasSidebar ? 100 - panelRatio : 100} minSize={40} className="relative">
                    <MainArea>{children}</MainArea>
                </ResizablePanel>
            </ResizablePanelGroup>
        </>
    );
}

function MobileLayout({children}: { children: React.ReactNode }) {
    const selectedTabs = useGUIState((state) => state.selectedSidebarTabs);
    const setSelectedTabs = useGUIState((state) => state.setSelectedSidebarTabs);
    const hasSelectedTabs = selectedTabs.length > 0;

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex-1 min-h-0 w-full relative">
                {hasSelectedTabs ? (
                    <NavigationBarContent selectedTabs={selectedTabs}/>
                ) : (
                    <MainArea>{children}</MainArea>
                )}
            </div>
            <div className="flex-none">
                <NavigationBarMobile
                    onBackButtonClick={() => setSelectedTabs([])}
                    selectedTabs={selectedTabs}
                    setSelectedTabs={setSelectedTabs}
                />
            </div>
        </div>
    );
}
