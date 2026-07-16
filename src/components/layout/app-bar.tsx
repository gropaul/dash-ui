'use client';

import {useEffect, useState} from "react";
import {Bug, BookOpen, HelpCircle, Maximize2, MoreVertical, Search, Settings, Star} from "lucide-react";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {isDebugMode} from "@/components/settings/about-content";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuSwitchItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useGUIState} from "@/state/gui.state";
import {useOnboardingState} from "@/state/onboarding.state";
import {ExportDatabaseButton} from "@/components/export/export-database-button";
import {WorkspacePathBreadcrumb} from "@/components/layout/workspace-path-breadcrumb";
import {openSearchCommand} from "@/components/workbench/global-command";

/**
 * The global top app bar — a full-width, slot-based shell above the icon rail + sidebar.
 *
 * Three regions keep it extensible: future items drop into a region without reflowing the
 * others. Today only the breadcrumb (LEFT) is functional; the logo and search are visual
 * placeholders to be wired later, and the RIGHT region is reserved for future actions.
 */
export function AppBar() {
    return (
        <header className="h-12 flex items-center gap-3 border-b bg-background flex-shrink-0">
            {/* LEFT — brand + current path (path is the only functional part today) */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={'w-16 flex items-center justify-center'}>
                    <AppBarLogo/>
                </div>
                <WorkspacePathBreadcrumb/>
            </div>

            {/* RIGHT — app actions: settings + an overflow menu for the rest */}
            <div className="flex items-center gap-1 flex-1 justify-end pr-2">
                <DebugModeBadge/>
                <AppBarSearch/>
                <AppBarActions/>
            </div>
        </header>
    );
}

// Settings stays visible; documentation, help, database export and the repo link live in an
// overflow ("more") dropdown. Moved here from the left icon rail.
function AppBarActions() {
    const openSettingsTab = useGUIState((s) => s.openSettingsTab);
    const fullWidth = useGUIState((s) => s.fullWidth);
    const setFullWidth = useGUIState((s) => s.setFullWidth);
    return (
        <>
            <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => openSettingsTab('connection')}>
                <Settings/>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="More options">
                        <MoreVertical/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={'text-accent-foreground'}>
                    <DropdownMenuSwitchItem
                        checked={fullWidth}
                        onCheckedChange={setFullWidth}
                        icon={<Maximize2 className="mr-2 h-4 w-4"/>}
                    >
                        Full Width
                    </DropdownMenuSwitchItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openSettingsTab('documentation')}>
                        <BookOpen className="mr-2 h-4 w-4"/> Documentation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => useOnboardingState.getState().openWelcomeTour()}>
                        <HelpCircle className="mr-2 h-4 w-4"/> Help
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <a href="https://github.com/gropaul/dash" target="_blank" rel="noopener noreferrer">
                            <Star className="mr-2 h-4 w-4"/> Star
                        </a>
                    </DropdownMenuItem>
                    <ExportDatabaseButton/>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

// A small badge shown only while debug mode is active (see isDebugMode). Read in an effect so
// the server render (always false) matches the first client render, avoiding a hydration mismatch.
function DebugModeBadge() {
    const [debug, setDebug] = useState(false);
    useEffect(() => setDebug(isDebugMode()), []);
    if (!debug) return null;
    return (
        <TooltipWrapper message="Debug mode is active — disable it in Settings › About.">
            <span className="flex items-center gap-1 h-6 px-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium select-none">
                <Bug size={12}/> Debug
            </span>
        </TooltipWrapper>
    );
}

// Visual only — the Dash logo. Reuses the favicon asset already used by the icon rail.
function AppBarLogo() {
    return (
        <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src="favicon/web-app-manifest-192x192.png" alt="Dash"/>
        </Avatar>
    );
}

// Opens the global command palette in "open" mode (also ⌘K / Ctrl-K or double-Shift).
function AppBarSearch() {
    return (
        <Button variant="ghost" size="icon" aria-label="Search" onClick={openSearchCommand}>
            <Search/>
        </Button>
    );
}
