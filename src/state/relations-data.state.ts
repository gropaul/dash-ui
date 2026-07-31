import {RelationData} from "@/model/relation";
import {createWithEqualityFn} from "zustand/traditional";
import {deleteCache, listCachedIds, loadCache, updateCache} from "@/state/relations-data/functions";
import {GetRelationStatsLoading, RelationState, RelationStats} from "@/model/relation-state";
import {LRUList} from "@/platform/lru";
import {DASH_CATALOG_STATE, N_RELATIONS_DATA_TO_LOAD} from "@/platform/global-data";
import {GetColumnStats} from "@/model/column-stats";
import {Column} from "@/model/data-source-connection";
import {ConnectionsService} from "@/state/connections/connections-service";
import {getProjectDashStateFileName} from "@/state/projects.state";


export interface CacheResult {
    data: RelationData; // we will always return data, even if it is empty
    wasCached: boolean; // sometimes we can't cache the data, e.g., if the query is not a select query
}

export interface RelationDataZustandActions {
    /* Data API */
    getData: (relationId: string) => RelationData | undefined;
    getDataForRelation: (relationState: RelationState) => RelationData | undefined;
    getColumnsForRelation: (relationState: RelationState) => Column[] | undefined;
    updateData: (relationId: string, data: RelationData) => RelationData;
    updateDataFromCache: (relationId: string) => Promise<RelationData | undefined>;
    updateDataFromQuery: (input: RelationState, query: string, readOnly?: boolean) => Promise<CacheResult>;
    deleteData: (relationId: string) => void;

    getStats: (relationId: string) => RelationStats;
    updateStats: (relationState: RelationState, data: RelationData) => Promise<RelationStats>;
    invalidateStats: (relationId: string) => void;

    recordUse: (relationId: string) => void;
    loadLastUsed: () => Promise<void>;
}

export interface RelationDataZustandState {
    data: Record<string, RelationData>;
    stats: Record<string, RelationStats>
}

export type RelationZustandCombined = RelationDataZustandState & RelationDataZustandActions;


interface CacheState {
    cache: LRUList<string>;
    use: (item: string) => void;
    clear: () => void;
    delete: (item: string) => void;
}

// In-memory only — NOT persisted. The persisted "last used" set lives in the per-project dash file
// as the cache tables themselves; loadLastUsed() reseeds this LRU from listCachedIds() on load, so it
// is inherently per-project and swapping projects needs no separate persisted key.
export const useCacheStore = createWithEqualityFn<CacheState>()(
    (set, get) => ({
        cache: new LRUList<string>(N_RELATIONS_DATA_TO_LOAD),
        use: (item) => {
            const cache = get().cache;
            cache.use(item);
            set({cache});
        },
        delete: (item: string) => {
            const cache = get().cache;
            if (!cache.contains(item)) return;
            cache.delete(item);
            set({cache});
        },
        clear: () => set({cache: new LRUList<string>(N_RELATIONS_DATA_TO_LOAD)}),
    })
);

export function getInitialRelationDataZustandState(): RelationDataZustandState {
    return {
        data: {},
        stats: {}
    };
}

export function useRelationData(relationState: RelationState) {
    return useRelationDataState((state) => state.getDataForRelation(relationState));
}

export function useRelationColumns(relationState: RelationState) {
    return useRelationDataState((state) => state.getColumnsForRelation(relationState));
}

export const useRelationDataState = createWithEqualityFn<RelationZustandCombined>(
    (set, get) => ({
        ...getInitialRelationDataZustandState(),

        recordUse: (relationId: string) => {
            useCacheStore.getState().use(relationId);
        },

        getData: (relationId: string) => {

            get().recordUse(relationId);
            if (relationId in get().data) {
                return get().data[relationId];
            } else {
                get().updateDataFromCache(relationId);
                return undefined;
            }
        },

        getDataForRelation: (relationState: RelationState) => {
            return get().getData(relationState.id);
        },

        getColumnsForRelation: (relationState: RelationState) => {
            return get().getData(relationState.id)?.columns;
        },

        updateData: (relationId: string, data: RelationData) => {
            set((state) => ({
                data: {
                    ...state.data,
                    [relationId]: data
                }
            }));
            get().recordUse(relationId);
            return data;
        },

        updateDataFromCache: async (relationId: string) => {
            const data = await loadCache(relationId)
            if (!data) {
                return undefined;
            }
            return get().updateData(relationId, data);
        },

        updateDataFromQuery: async (input: RelationState, query: string, readOnly: boolean = false) => {
            const result = await updateCache(input.id, query, readOnly);
            get().updateData(input.id, result.data);
            return result;
        },

        deleteData: async (relationId: string) => {

            const state = get();
            console.log(`Deleting relation data for ${relationId}`);

            // throw an error if the relationId is not in the state
            try {
                await deleteCache(relationId);
            } catch (e) {
                console.error(`Failed to delete cache for relation ${relationId}:`, e);
            }
            useCacheStore.getState().delete(relationId);
            set((state) => {
                const newData = {...state.data};
                delete newData[relationId];
                return {data: newData};
            });
        },

        getStats: (relationId: string) => {
            if (relationId in get().stats) {
                return get().stats[relationId];
            }
            return {
                state: "empty"
            }
        },

        invalidateStats: (relationId: string) => {
            set((state) => {
                    const newStats = {...state.stats};
                    delete newStats[relationId];
                    return {stats: newStats};
                }
            );
        },

        updateStats: async (relationState: RelationState, data: RelationData) => {

            // set loading state
            set((state) => ({
                stats: {
                    ...state.stats,
                    [relationState.id]: GetRelationStatsLoading()
                }
            }));

            const stats = await GetColumnStats(relationState, data);
            if (!stats) {
                throw new Error(`Failed to compute stats for relation ${relationState.id}`);
            }
            set((state) => ({
                stats: {
                    ...state.stats,
                    [relationState.id]: stats
                }
            }));
            return stats;
        },

        loadLastUsed: async () => {

            // first try to attach the cache database to the connection
            if (!ConnectionsService.getInstance().hasDatabaseConnection()) {
                throw new Error('loadLastUsed: No database connection available');
            }

            const allCachedIds = await listCachedIds();
            console.log('We found n= ' + allCachedIds.length + ' cached relations.');
            const reseeded = new LRUList<string>(N_RELATIONS_DATA_TO_LOAD);
            reseeded.useAll(allCachedIds);
            useCacheStore.setState({cache: reseeded});

            // Only pre-warm the (≤ capacity) tables tracked by the reseeded LRU; the rest load lazily.
            const ids_to_hydrate = reseeded.getElements();

            const keysLoadFailed = [];
            for (const relationId of ids_to_hydrate) {
                const data = await get().updateDataFromCache(relationId);
                if (!data) {
                    keysLoadFailed.push(relationId);
                }
            }
            if (keysLoadFailed.length > 0) {
                console.warn(`Failed to load data for relations with ids: ${keysLoadFailed.join(", ")}. Removing them from cache.`);
                keysLoadFailed.forEach(get().deleteData);
            }
        }
    })
);



