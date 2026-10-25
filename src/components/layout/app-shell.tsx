'use client';

import React from "react";
import {NavigationSidebar} from "@/components/layout/navigation-sidebar";
import {AppBar} from "@/components/layout/app-bar";

/**
 * Router-driven shell. The full-height left navigation sidebar (holds the logo), then the
 * AppBar (workspace path breadcrumb + actions) above the routed view in <main>. The routed page
 * is passed as `children`; whether the sidebar is expanded stays UI-only state, orthogonal to the route.
 */
export function AppShell({children}: { children: React.ReactNode }) {
    return (
        <div className="relative h-full w-full flex flex-row">
            <NavigationSidebar/>
            <MainArea>{children}</MainArea>
        </div>
    );
}

function MainArea({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full flex-1 min-w-0">
            <AppBar/>
            <main className="flex-1 min-h-0 relative overflow-auto">{children}</main>
        </div>
    );
}
