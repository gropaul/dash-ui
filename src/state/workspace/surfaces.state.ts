import {create} from "zustand";
import {RelationState} from "@/model/relation-state";

/** The page a surface key belongs to: `Sales/Q3.md` for `Sales/Q3.md#region`; undefined for a query's path. */
export function pageOfSurface(id: string): string | undefined {
    const i = id.indexOf('#');
    return i < 0 ? undefined : id.slice(0, i);
}

/** The file a surface key belongs to: the query's path, or the block's page. */
export const fileOfSurface = (id: string) => pageOfSurface(id) ?? id;

/**
 * The relation each surface shows, in memory only: its config as its file has it, plus picks, the run, paging
 * and session state. Keyed by surface: a query's path, or `page.md#name` (`page.md#3` unnamed) for a block.
 * Its file is the source of truth for the config (dev/workspace-files.md).
 */
interface SurfacesState {
    relations: Record<string, RelationState>;
    set(relation: RelationState): void;
    remove(id: string): void;
}

export const useSurfaces = create<SurfacesState>((set) => ({
    relations: {},
    set: (relation) => set(state => state.relations[relation.id] === relation
        ? state
        : {relations: {...state.relations, [relation.id]: relation}}),
    remove: (id) => set(state => {
        if (!(id in state.relations)) return state;
        const relations = {...state.relations};
        delete relations[id];
        return {relations};
    }),
}));

/** The relations of the page's blocks that are on screen. */
export function surfacesOfPage(page: string): Record<string, RelationState> {
    const prefix = `${page}#`;
    return Object.fromEntries(Object.entries(useSurfaces.getState().relations).filter(([id]) => id.startsWith(prefix)));
}
