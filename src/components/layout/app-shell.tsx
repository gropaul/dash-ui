'use client';

import React from "react";
import {NavigationSidebar} from "@/components/layout/navigation-sidebar";
import {AppBar} from "@/components/layout/app-bar";

/**
 * Router-driven shell. A full-width AppBar across the top (holds the global
 * workspace path breadcrumb + future brand/search), then the left navigation
 * sidebar + the routed view in <main>. The routed page is passed as `children`;
 * whether the sidebar is expanded stays UI-only state, orthogonal to the route.
 */
export function AppShell({children}: { children: React.ReactNode }) {
    return (
        <div className="relative h-full w-full flex flex-col">
            <AppBar/>
            <div className="flex flex-row flex-1 min-h-0">
                <NavigationSidebar/>
                <MainArea>{children}</MainArea>
            </div>
        </div>
    );
}

function MainArea({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full flex-1 min-w-0">
            <main className="flex-1 min-h-0 relative overflow-auto">{children}</main>
        </div>
    );
}
