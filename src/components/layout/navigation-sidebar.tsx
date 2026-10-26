'use client';

import React from "react";
import {Database, LucideIcon, PanelLeftClose, PanelLeftOpen, Plug} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";
import {useGUIState} from "@/state/gui.state";
import {DashLocation, DashLocations, DashNavigator} from "@/state/routing/navigation";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {WorkspaceTree} from "@/components/layout/workspace-tree";
import {RecentlyAccessedSection} from "@/components/layout/recently-accessed-section";
import {Avatar, AvatarImage} from "@/components/ui/avatar";

/**
 * The single left navigation sidebar. Routing-driven (each item is a real link), grouped by
 * scope: PROJECT (Workspace + Connections + Catalog, all per-project) and GENERAL (All
 * projects). The grouping is the primary scope cue.
 *
 * Collapsed → an icon rail with tooltips. Expanded → icons + labels plus room for
 * extra sections (e.g. Recently accessed). The expanded/collapsed flag is UI-only
 * state persisted in gui.state; the active item is derived purely from the URL.
 */

type NavKey = 'connections' | 'catalog';

// Limits for dragging the expanded sidebar's width; collapsed it is a fixed icon rail.
const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const COLLAPSED_WIDTH = 64;

interface NavItem {
    key: NavKey;
    label: string;
    icon: LucideIcon;
    location: DashLocation;
}

// The workspace has no entry: the project's name in the app bar opens it, and the file tree browses it. The
// projects list is in the project switcher.
function activeKeyForLocation(location: DashLocation): NavKey | undefined {
    if (location.basePath === 'projects') return;
    if (location.section === 'connections') return 'connections';
    if (location.section === 'data') return 'catalog';
}

export function NavigationSidebar() {
    const expanded = useGUIState((s) => s.sidebarExpanded);
    const setExpanded = useGUIState((s) => s.setSidebarExpanded);
    const savedWidth = useGUIState((s) => s.sidebarWidth);
    // The width while a drag is under way; saved once the drag ends.
    const [dragWidth, setDragWidth] = React.useState<number | undefined>();
    const location = useDashLocation();

    // Per-project hrefs depend on the current project, so this is built per render (not a module
    // const). CurrentProject* read the current project id from the store at call time.
    const projectItems: NavItem[] = [
        {key: 'connections', label: 'Connections', icon: Plug, location: DashLocations.CurrentProjectConnections()},
        {key: 'catalog', label: 'Data', icon: Database, location: DashLocations.CurrentProjectData()},
    ];
    const activeKey = activeKeyForLocation(location);

    // The project-scoped destinations only make sense inside a project. When no project is
    // selected (e.g. the All-projects list), hide that group and show only the general items.
    const inProject = location.basePath === 'project';

    const renderGroup = (label: string, items: NavItem[]) => (
        <div className="flex flex-col gap-0.5">
            <SectionHeader label={label} extended={expanded}/>
            {items.map((item) => (
                <NavLink key={item.key} item={item} active={item.key === activeKey} expanded={expanded}/>
            ))}
        </div>
    );

    return (
        <TooltipProvider delayDuration={300}>
            <nav
                className={cn(
                    "relative h-full flex flex-col bg-muted-background border-r shrink-0 overflow-hidden",
                    dragWidth === undefined && "transition-[width] duration-200 ease-in-out",
                )}
                style={{width: expanded ? dragWidth ?? savedWidth : COLLAPSED_WIDTH}}
            >
                {/* Logo row, as high as the app bar so the toggle and the bottom line line up with it. Collapsed, only the toggle shows. */}
                <div className={cn("flex h-10 shrink-0 items-center border-b", expanded ? "justify-between pl-4 pr-2" : "justify-center")}>
                    {expanded && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src="/favicon/web-app-manifest-192x192.png" alt="Dash"/>
                        </Avatar>
                    )}
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

                {/* Nav destinations, grouped by scope. */}
                <div className="flex flex-col gap-3 p-2 pt-5">
                    {inProject && renderGroup("Project", projectItems)}
                </div>

                {/* Extra sections when expanded, scrolling together: the few recent files first, then the workspace.
                    Slot-based — future sections drop in here. */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {expanded && <RecentlyAccessedSection/>}
                    {expanded && location.basePath === 'project' && <WorkspaceTree projectId={location.projectId}/>}
                </div>

                {expanded && <ResizeHandle width={savedWidth} onDrag={setDragWidth}/>}

            </nav>
        </TooltipProvider>
    );
}

/** The right edge of the expanded sidebar; dragging it sets the width, which is saved when the drag ends. */
function ResizeHandle({width, onDrag}: {width: number; onDrag: (width: number | undefined) => void}) {
    const setSidebarWidth = useGUIState((s) => s.setSidebarWidth);
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        const handle = e.currentTarget;
        const startX = e.clientX;
        let last = width;
        const onMove = (ev: PointerEvent) => {
            last = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width + ev.clientX - startX));
            onDrag(last);
        };
        // Fires on release and on a cancelled drag alike.
        const onEnd = () => {
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('lostpointercapture', onEnd);
            setSidebarWidth(last);
            onDrag(undefined);
        };
        handle.setPointerCapture(e.pointerId);
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('lostpointercapture', onEnd);
    };
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={onPointerDown}
            className="absolute inset-y-0 right-0 w-1 cursor-col-resize transition-colors hover:bg-border active:bg-border"
        />
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

export function SectionHeader({label, extended}: {label: string, extended: boolean}) {
    // Collapses to zero height instead of leaving a blank band in the icon rail. The height
    // animates on the same curve as the sidebar width, so the nav icons glide into place.
    return (
        <div
            className={cn(
                "flex items-center overflow-hidden px-3",
                "transition-[height,opacity] duration-200 ease-in-out",
                extended ? "h-6 opacity-100" : "h-0 opacity-0",
            )}
            aria-hidden={!extended}
        >
            <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {label}
            </span>
        </div>
    );
}
