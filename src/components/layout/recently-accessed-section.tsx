'use client';

import React from "react";
import {cn} from "@/lib/utils";
import {useRelationsState} from "@/state/relations.state";
import {routeForNodeId} from "@/state/routing/core-model";
import {onNavClick, useCurrentPath} from "@/state/routing/use-location";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {formatRelativeTime} from "@/platform/string-utils";
import {selectRecentWorkspaceItems} from "@/state/recent/recent-items";
import {SectionHeader} from "@/components/layout/navigation-sidebar";

const RECENT_LIMIT = 5;

/**
 * The sidebar "Recently accessed" list. Surfaces the most recently viewed workspace items
 * (queries/dashboards/canvases/folders), grouped under a "Workspace" sub-header. `lastViewedAt`
 * is stamped on every navigation by `markEntityViewed`, so this re-renders live as you browse.
 *
 * A second "Data" group (recently viewed catalog tables) is planned but needs its own
 * access-tracking store first — see the plan / catalog-view.
 */
export function RecentlyAccessedSection() {
    const editorElements = useRelationsState((s) => s.editorElements);
    const relations = useRelationsState((s) => s.relations);
    const dashboards = useRelationsState((s) => s.dashboards);
    const canvas = useRelationsState((s) => s.canvas);
    const pathname = useCurrentPath();

    const items = selectRecentWorkspaceItems({editorElements, relations, dashboards, canvas}, RECENT_LIMIT);

    return (
        <div className="px-2 pt-4">
            <SectionHeader label="Recently accessed"/>
            {items.length === 0 ? (
                <div className="px-3 pt-1 text-xs text-muted-foreground/70">
                    Your recent items will appear here.
                </div>
            ) : (
                <>
                    {/* Sub-group label — hidden while "Workspace" is the only group. Re-enable
                        once the "Data" (recently viewed tables) group lands alongside it. */}
                    {/* <div className="px-3 pb-1 text-[11px] font-medium text-muted-foreground/60">Workspace</div> */}
                    <div className="flex flex-col gap-0.5">
                        {items.map((item) => {
                            const to = routeForNodeId(editorElements, item.id);
                            if (!to) return null;
                            const active = pathname === to;
                            return (
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        <a
                                            href={to}
                                            onClick={onNavClick(to)}
                                            aria-current={active ? "page" : undefined}
                                            className={cn(
                                                "group flex items-center gap-2.5 h-9 px-3 rounded-md text-sm select-none transition-colors",
                                                active
                                                    ? "bg-accent text-foreground font-medium"
                                                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                                            )}
                                        >
                                            <ColoredIcon type={item.iconType} size={18} background={false}/>
                                            <span className="truncate flex-1 min-w-0">{item.name}</span>
                                            <span className="shrink-0 text-[11px] text-muted-foreground/70 tabular-nums">
                                                {formatRelativeTime(item.lastViewedAt)}
                                            </span>
                                        </a>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">{item.name}</TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
