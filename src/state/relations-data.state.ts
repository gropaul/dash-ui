import {RelationData} from "@/model/relation";
import {persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {deleteCache, loadCache, updateCache} from "@/state/relations-data/functions";
import {RelationState} from "@/model/relation-state";


export interface CacheResult {
    data: RelationData; // we will always return data, even if it is empty
    wasCached: boolean; // sometimes we can't cache the data, e.g., if the query is not a select query
}

export interface RelationDataZustandActions {
    getData: (relationId: string) => RelationData | undefined;
    getDataForRelation: (relationState: RelationState) => RelationData | undefined;
    updateData: (relationId: string, data: RelationData) => RelationData;
    updateDataFromCache: (relationId: string) => Promise<RelationData>;
    updateDataFromQuery: (relationId: string, query: string) => Promise<CacheResult>;

    deleteData: (relationId: string) => void;

}

export interface RelationDataZustandState {
    data: Record<string, RelationData>;
}

export type RelationZustandCombined = RelationDataZustandState & RelationDataZustandActions;

export function getInitialRelationDataZustandState(): RelationDataZustandState {
    return {
        data: {}
    };
}

export function useRelationData(relationState: RelationState) {
    return useRelationDataState((state) => state.getDataForRelation(relationState));
}
export const useRelationDataState = createWithEqualityFn(
    persist<RelationZustandCombined>(
        (set, get) => ({
            ...getInitialRelationDataZustandState(),

            getData: (relationId: string) => {
                const relationData = get().data[relationId];
                if (!relationData) {
                    return undefined;
                }
                return relationData;
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
                return data;
            },

            updateDataFromCache: async (relationId: string) =>  {
                const data = await loadCache(relationId)
                return get().updateData(relationId, data);
            },

            updateDataFromQuery: async (relationId: string, query: string) => {
                const result = await updateCache(relationId, query);
                get().updateData( relationId, result.data);
                return result;
            },

            deleteData: async (relationId: string) => {
                await deleteCache(relationId);
                set((state) => {
                    const newData = {...state.data};
                    delete newData[relationId];
                    return {data: newData};
                });
            },
        }),
        {
            name: 'relation-data-storage', // unique name for the storage
            onRehydrateStorage: (state) => {
                console.log('hydration starts')

                // optional
                return (state, error) => {
                    if (error) {
                        console.log('an error happened during hydration', error)
                    } else {
                        console.log('hydration finished')
                    }
                }
            },
        },
    ),
)