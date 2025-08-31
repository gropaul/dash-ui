import {RelationData} from "@/model/relation";
import {persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {deleteCache, loadCache, updateCache} from "@/state/relations-data/functions";
import {RelationState} from "@/model/relation-state";
import {LRUList} from "@/platform/lru";
import {N_RELATIONS_DATA_TO_LOAD} from "@/platform/global-data";


export interface CacheResult {
    data: RelationData; // we will always return data, even if it is empty
    wasCached: boolean; // sometimes we can't cache the data, e.g., if the query is not a select query
}

export interface RelationDataZustandActions {
    getData: (relationId: string) => RelationData | undefined;
    getDataForRelation: (relationState: RelationState) => RelationData | undefined;
    updateData: (relationId: string, data: RelationData) => RelationData;
    updateDataFromCache: (relationId: string) => Promise<RelationData | undefined>;
    updateDataFromQuery: (relationId: string, query: string) => Promise<CacheResult>;

    deleteData: (relationId: string) => void;

    recordUse: (relationId: string) => void;
    loadLastUsed: () => Promise<void>;
}

export interface RelationDataZustandState {
    data: Record<string, RelationData>;
}

export type RelationZustandCombined = RelationDataZustandState & RelationDataZustandActions;


interface CacheState {
    cache: LRUList<string>;
    use: (item: string) => void;
    clear: () => void;
}

export const useCacheStore = createWithEqualityFn<CacheState>()(
    persist(
        (set, get) => ({
            cache: new LRUList<string>(N_RELATIONS_DATA_TO_LOAD),
            use: (item) => {
                const cache = get().cache;
                cache.use(item);
                set({cache});
            },
            clear: () => set({cache: new LRUList<string>(N_RELATIONS_DATA_TO_LOAD)}),
        }),
        {
            name: 'cache-store',
            partialize: (state) => ({
                cache: state.cache.getElements()
            }),
            // rehydrate into an LRUList when loading from storage
            merge: (persisted, current) => {
                const data = persisted as { cache?: string[] };
                const lru = new LRUList<string>(N_RELATIONS_DATA_TO_LOAD);
                if (data.cache) {
                    for (const v of data.cache) {
                        lru.use(v);
                    }
                }
                return {...current, cache: lru};
            },
        }
    )
);

export function getInitialRelationDataZustandState(): RelationDataZustandState {
    return {
        data: {}
    };
}

export function useRelationData(relationState: RelationState) {
    return useRelationDataState((state) => state.getDataForRelation(relationState));
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
            }else{
                get().updateDataFromCache(relationId);
                return undefined;
            }
        },

        getDataForRelation: (relationState: RelationState) => {
            return get().getData(relationState.id);
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

        updateDataFromQuery: async (relationId: string, query: string) => {
            console.log(`Updating relation data for relationId ${relationId} from query: ${query}`);
            const result = await updateCache(relationId, query);
            get().updateData(relationId, result.data);
            return result;
        },

        deleteData: async (relationId: string) => {

            // throw an error if the relationId is not in the state
            if (!get().data[relationId]) {
                throw new Error(`Relation data with id ${relationId} does not exist in the state`);
            }

            await deleteCache(relationId);
            set((state) => {
                const newData = {...state.data};
                delete newData[relationId];
                return {data: newData};
            });
        },
        loadLastUsed: async () => {
            const ids_to_hydrate = useCacheStore.getState().cache.getElements();
            for (const relationId of ids_to_hydrate) {
                if (!get().data[relationId]) {
                    await get().updateDataFromCache(relationId);
                }
            }
        }
    })
);



