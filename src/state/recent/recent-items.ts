import {FileStats} from "@/state/workspace/file-stats.state";
import {displayName, isListed, kindOf, WorkspaceNodeKind} from "@/state/workspace/workspace-tree";

/** A "recently accessed" file of the workspace; `id` is its path. */
export interface RecentItem {
    id: string;
    name: string;
    kind: WorkspaceNodeKind;
    lastViewedAt: number;
}

/** The most recently viewed files that still exist, newest first. */
export function selectRecentFiles(paths: Set<string>, stats: Record<string, FileStats>, limit = 5): RecentItem[] {
    const items: RecentItem[] = [];
    for (const [path, {lastViewedAt}] of Object.entries(stats)) {
        if (lastViewedAt === undefined || !paths.has(path) || !isListed(path)) continue;
        items.push({id: path, name: displayName(path), kind: kindOf(path), lastViewedAt});
    }
    items.sort((a, b) => b.lastViewedAt - a.lastViewedAt);
    return items.slice(0, limit);
}

/**
 * Keeps the order the list was last shown in, so viewing an item already listed does not move it.
 * An item that just entered goes on top; a backfill (older than the newest kept item, e.g. after a
 * delete) goes at the bottom. Eviction stays least-recently-viewed, since `items` is the top-N.
 */
export function keepDisplayOrder(prevIds: string[], items: RecentItem[]): RecentItem[] {
    const byId = new Map(items.map((i) => [i.id, i]));
    const kept = prevIds.flatMap((id) => byId.get(id) ?? []);
    const newestKept = Math.max(-Infinity, ...kept.map((i) => i.lastViewedAt));
    const prev = new Set(prevIds);
    const added = items.filter((i) => !prev.has(i.id));
    return [
        ...added.filter((i) => i.lastViewedAt > newestKept),
        ...kept,
        ...added.filter((i) => i.lastViewedAt <= newestKept),
    ];
}
