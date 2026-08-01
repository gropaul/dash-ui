'use client';

import React from "react";
import {Database, Folder, LayoutGrid, LucideIcon, PanelLeftClose, PanelLeftOpen, Plug} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";
import {useGUIState} from "@/state/gui.state";
import {DashLocation, DashLocations, DashNavigator} from "@/state/routing/navigation";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {RecentlyAccessedSection} from "@/components/layout/recently-accessed-section";

/**
 * The single left navigation sidebar. Routing-driven (each item is a real link), grouped by
 * scope: PROJECT (Workspace + Connections + Catalog, all per-project) and GENERAL (All
 * projects). The grouping is the primary scope cue.
 *
 * Collapsed → an icon rail with tooltips. Expanded → icons + labels plus room for
 * extra sections (e.g. Recently accessed). The expanded/collapsed flag is UI-only
 * state persisted in gui.state; the active item is derived purely from the URL.
 */

type NavKey = 'workspace' | 'connections' | 'catalog' | 'projects';

interface NavItem {
    key: NavKey;
    label: string;
    icon: LucideIcon;
    location: DashLocation;
}

function activeKeyForLocation(location: DashLocation): NavKey {
    if (location.basePath === 'projects') return 'projects';
    if (location.section === 'connections') return 'connections';
    if (location.section === 'data') return 'catalog';
    return 'workspace';
}

export function NavigationSidebar() {
    const expanded = useGUIState((s) => s.sidebarExpanded);
    const setExpanded = useGUIState((s) => s.setSidebarExpanded);
    const location = useDashLocation();

    // Per-project hrefs depend on the current project, so this is built per render (not a module
    // const). CurrentProject* read the current project id from the store at call time.
    const projectItems: NavItem[] = [
        {key: 'workspace', label: 'Workspace', icon: Folder, location: DashLocations.CurrentProjectRoot()},
        {key: 'connections', label: 'Connections', icon: Plug, location: DashLocations.CurrentProjectConnections()},
        {key: 'catalog', label: 'Catalog', icon: Database, location: DashLocations.CurrentProjectData()},
    ];
    const generalItems: NavItem[] = [
        {key: 'projects', label: 'All projects', icon: LayoutGrid, location: DashLocations.ProjectsList()},
    ];
    const activeKey = activeKeyForLocation(location);

    // The project-scoped destinations only make sense inside a project. When no project is
    // selected (e.g. the All-projects list), hide that group and show only the general items.
    const inProject = location.basePath === 'project';

    const renderGroup = (label: string, items: NavItem[]) => (
        <div className="flex flex-col gap-0.5">
            {expanded && <SectionHeader label={label}/>}
            {items.map((item) => (
                <NavLink key={item.key} item={item} active={item.key === activeKey} expanded={expanded}/>
            ))}
        </div>
    );

    return (
        <TooltipProvider delayDuration={300}>
            <nav
                className={cn(
                    "h-full flex flex-col bg-muted-background border-r shrink-0 overflow-hidden",
                    "transition-[width] duration-200 ease-in-out",
                    expanded ? "w-60" : "w-16",
                )}
            >
                {/* Nav destinations, grouped by scope. */}
                <div className="flex flex-col gap-3 p-2 pt-5">
                    {inProject && renderGroup("Project", projectItems)}
                    {renderGroup("General", generalItems)}
                </div>

                {/* Middle region: extra sections when expanded, otherwise a spacer so the
                    footer stays pinned to the bottom. Slot-based — future sections drop in here. */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {expanded && <RecentlyAccessedSection/>}
                </div>

                {/* Collapse / expand toggle */}
                <div className={cn("p-2 flex", expanded ? "justify-end" : "justify-center")}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? <PanelLeftClose/> : <PanelLeftOpen/>}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{expanded ? "Collapse sidebar" : "Expand sidebar"}</TooltipContent>
                    </Tooltip>
                </div>
            </nav>
        </TooltipProvider>
    );
}

function NavLink({item, active, expanded}: {item: NavItem; active: boolean; expanded: boolean}) {
    const Icon = item.icon;
    const link = (
        <a
            onClick={DashNavigator.instance().onClickNavigateToLocation(item.location)}
            aria-current={active ? "page" : undefined}
            className={cn(
                "group relative flex items-center h-9 rounded-md text-sm select-none transition-colors",
                expanded ? "px-3 gap-3" : "justify-center",
                active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
        >
            {/* Active indicator bar — reaches the sidebar edge (cancels the parent's px-2). */}
            <span
                aria-hidden
                className={cn(
                    "absolute -left-2 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary transition-all",
                    active ? "h-5 opacity-100" : "h-0 opacity-0",
                )}
            />
            <Icon
                className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                )}
            />
            {expanded && <span className="truncate">{item.label}</span>}
        </a>
    );

    if (expanded) return link;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
    );
}

export function SectionHeader({label}: {label: string}) {
    return (
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {label}
        </div>
    );
}
