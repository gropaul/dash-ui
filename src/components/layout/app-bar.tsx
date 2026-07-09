'use client';

import {BookOpen, HelpCircle, MoreVertical, Search, Settings, Star} from "lucide-react";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {InputWithIcon} from "@/components/ui/input-with-icon";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useGUIState} from "@/state/gui.state";
import {useOnboardingState} from "@/state/onboarding.state";
import {ExportDatabaseButton} from "@/components/export/export-database-button";
import {WorkspacePathBreadcrumb} from "@/components/layout/workspace-path-breadcrumb";

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
                {/*<AppBarSearch/>*/}
                <AppBarActions/>
            </div>
        </header>
    );
}

// Settings stays visible; documentation, help, database export and the repo link live in an
// overflow ("more") dropdown. Moved here from the left icon rail.
function AppBarActions() {
    const openSettingsTab = useGUIState((s) => s.openSettingsTab);
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
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openSettingsTab('documentation')}>
                        <BookOpen className="mr-2 h-4 w-4"/> Documentation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => useOnboardingState.getState().openWelcomeTour()}>
                        <HelpCircle className="mr-2 h-4 w-4"/> Help &amp; tour
                    </DropdownMenuItem>
                    <ExportDatabaseButton/>
                    <DropdownMenuItem asChild>
                        <a href="https://github.com/gropaul/dash" target="_blank" rel="noopener noreferrer">
                            <Star className="mr-2 h-4 w-4"/> Star on GitHub
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
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

// Visual only — a non-interactive search box. No state/handler until the search feature lands.
function AppBarSearch() {
    return (
        <div className="w-full max-w-md" aria-hidden="true">
            <InputWithIcon
                startIcon={Search}
                placeholder="Search…"
                readOnly
                disabled
                tabIndex={-1}
                className="h-8 cursor-default"
            />
        </div>
    );
}
