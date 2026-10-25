'use client';

import React, {useMemo, useState} from "react";
import {cn} from "@/lib/utils";
import {useFilePaths} from "@/state/workspace/workspace.state";
import {useFileStats} from "@/state/workspace/file-stats.state";
import {useProjectsState} from "@/state/projects.state";
import {fileIconType} from "@/components/workspace/file-icon";
import {DashNavigator} from "@/state/routing/navigation";
import { useDashLocation} from "@/state/routing/use-dash-location";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {formatRelativeTime} from "@/platform/string-utils";
import {keepDisplayOrder, selectRecentFiles} from "@/state/recent/recent-items";
import {SectionHeader} from "@/components/layout/navigation-sidebar";

const RECENT_LIMIT = 3;

/**
 * The sidebar "Recently accessed" list: the most recently viewed files. `lastViewedAt` is stamped when a
 * file is opened (file stats); the order only changes when an item enters the list (`keepDisplayOrder`).
 *
 * A second "Data" group (recently viewed catalog tables) is planned but needs its own
 * access-tracking store first — see the plan / catalog-view.
 */
export function RecentlyAccessedSection() {
    const paths = useFilePaths();
    const projectId = useProjectsState((s) => s.currentProjectId);
    const stats = useFileStats((s) => s.stats[projectId]);

    const recent = useMemo(() => selectRecentFiles(new Set(paths), stats ?? {}, RECENT_LIMIT), [paths, stats]);
    const [shownIds, setShownIds] = useState<string[]>([]);
    const items = keepDisplayOrder(shownIds, recent);
    const itemIds = items.map((i) => i.id);
    if (itemIds.join() !== shownIds.join()) setShownIds(itemIds);

    return (
        <div className="px-2 pt-4">
            <SectionHeader label="Recently accessed" extended={true}/>
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
                            return (
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        <a
                                            href={DashNavigator.instance().getUrlFromPath(item.id)}
                                            onClick={DashNavigator.instance().onClickNavigateToPath(item.id)}
                                            // Not the browser's own link drag: nothing here takes it.
                                            draggable={false}
                                            className={cn(
                                                "group flex items-center gap-2.5 h-9 px-3 " +
                                                "rounded-md text-sm select-none transition-colors " +
                                                "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                                            )}
                                        >
                                            <ColoredIcon type={fileIconType({kind: item.kind, path: item.id})} size={18} background={false}/>
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
