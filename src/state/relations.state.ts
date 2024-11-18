import {getRelationId, Relation} from "@/model/relation";
import {create} from "zustand";
import {Model} from "flexlayout-react";
import {addRelationToLayout, focusRelationInLayout, getInitialLayoutModel} from "@/state/relations/layout-updates";
import {
    getDefaultQueryParams, getViewFromRelation,
    getViewFromRelationName,
    RelationQueryParams, RelationState,
} from "@/model/relation-state";
import {getInitViewState, RelationViewState} from "@/model/relation-view-state";


interface RelationStates {

    relations: { [key: string]: RelationState };

    doesRelationExist: (relationId: string) => boolean,
    getRelation: (relationId: string) => RelationState,
    closeRelation: (relationId: string) => void,

    showRelation: (relation: Relation) => Promise<void>,
    showRelationByName: (connectionId: string, databaseName: string, schemaName: string, relationName: string) => Promise<void>,

    updateRelationData: (relationId: string, query: RelationQueryParams) => Promise<void>,

    setRelationViewState: (relationId: string, viewState: RelationViewState) => void,
    getRelationViewState: (relationId: string) => RelationViewState,
    updateRelationViewState: (relationId: string, viewState: Partial<RelationViewState>) => void,

    layoutModel: Model;
    getModel: () => Model;
    setModel: (model: Model) => void;
}

export const useRelationsState = create<RelationStates>((set, get) => ({
    relations: {},
    selectedRelationsIndex: undefined,

    doesRelationExist: (relationId: string) => get().relations[relationId] !== undefined,
    getRelation: (relationId: string) => get().relations[relationId],
    showRelation: async (relation: Relation) => {
        return get().showRelationByName(relation.connectionId, relation.database, relation.schema, relation.name);
    },
    showRelationByName: async (connectionId: string, databaseName: string, schemaName: string, relationName: string) => {

        const relationId = getRelationId(connectionId, databaseName, schemaName, relationName);

        // check if relation already exists
        const existingRelation = get().relations[relationId];
        if (existingRelation) {
            focusRelationInLayout(get().layoutModel, existingRelation.id);
        } else {

            const defaultQueryParams = getDefaultQueryParams();
            const relationWithQuery = await getViewFromRelationName(connectionId, databaseName, schemaName, relationName, defaultQueryParams);

            const relation: RelationState = {
                ...relationWithQuery,
                viewState: getInitViewState(relationWithQuery),
            }

            set((state) => ({
                relations: {
                    ...state.relations,
                    [relationId]: relation,
                },
            }));

            const model = get().layoutModel;
            addRelationToLayout(model, relation);
        }
    },

    updateRelationData: async (relationId, query) => {
        const { relations } = get(); // Get the current state
        const relation = relations[relationId]; // Retrieve the specific relation
        const relationWithQuery = await getViewFromRelation(relation, query);

        set((state) => ({
            relations: {
                ...state.relations,
                [relationId]: {
                    ...relationWithQuery,
                    viewState: relation.viewState,
                }
            },
        }));
    },

    setRelationViewState: (relationId: string, viewState: RelationViewState) => {
        set((state) => ({
            relations: {
                ...state.relations,
                [relationId]: {
                    ...state.relations[relationId],
                    viewState,
                },
            }
        }));
    },

    getRelationViewState: (relationId: string) => {
        return get().relations[relationId].viewState;
    },
    updateRelationViewState: (relationId: string, viewState: Partial<RelationViewState>) => {
        set((state) => ({
            relations: {
                ...state.relations,
                [relationId]: {
                    ...state.relations[relationId],
                    viewState: {
                        ...state.relations[relationId].viewState,
                        ...viewState,
                    },
                },
            },
        }));
    },
    closeRelation: (relationId: string) => {
        const { relations } = get(); // Get the current state
        delete relations[relationId]; // Remove the specified relation
        set({ relations }); // Update the state
    },

    getModel: () => get().layoutModel,
    setModel: (model: Model) =>
        set(() => ({
                layoutModel: model,
            }),
        ),

    layoutModel: getInitialLayoutModel({relations: []}),
}));
