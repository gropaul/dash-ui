import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {isWithin, movedPath} from "@/state/workspace/paths";

export interface FileStats {
    lastViewedAt?: number;
}

/** When each file was last viewed, per project, kept in this browser only. */
interface FileStatsState {
    stats: Record<string, Record<string, FileStats>>;
    markViewed(projectId: string, path: string): void;
    /** Carries the stats of `from`, a file or a folder, over to `to`. */
    move(projectId: string, from: string, to: string): void;
    remove(projectId: string, path: string): void;
}

export const useFileStats = create<FileStatsState>()(persist((set) => {
    const update = (projectId: string, change: (stats: Record<string, FileStats>) => Record<string, FileStats>) =>
        set(state => ({stats: {...state.stats, [projectId]: change(state.stats[projectId] ?? {})}}));

    return {
        stats: {},
        markViewed: (projectId, path) => update(projectId, stats => ({...stats, [path]: {lastViewedAt: Date.now()}})),
        move: (projectId, from, to) => update(projectId, stats => Object.fromEntries(
            Object.entries(stats).map(([p, s]) => [isWithin(p, from) ? movedPath(p, from, to) : p, s]),
        )),
        remove: (projectId, path) => update(projectId, stats => Object.fromEntries(
            Object.entries(stats).filter(([p]) => !isWithin(p, path)),
        )),
    };
}, {name: 'dash-file-stats', storage: createJSONStorage(() => localStorage)}));
