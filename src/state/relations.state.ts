import {v4 as uuidv4} from "uuid";
import {getRelationId, Relation} from "@/model/relation";
import {create} from "zustand";
import {Model} from "flexlayout-react";
import {addRelationToLayout, focusRelationInLayout, getInitialLayoutModel} from "@/state/relations/layout-updates";
import {
    getDefaultQueryParams, getViewFromRelation,
    getViewFromRelationName,
    RelationQueryParams, RelationState,
} from "@/model/relation-state";


interface RelationStates {

    relations: RelationState[],

    showRelation: (relation: Relation) => Promise<void>,
    showRelationByName: (connectionId: string, databaseName: string, schemaName: string, relationName: string) => Promise<void>,
    getRelation: (relationId: string) => RelationState | undefined,
    updateRelationDisplay: (relationId: string, query: RelationQueryParams) => Promise<void>,
    closeRelation: (relationId: string) => void,

    layoutModel: Model;
    getModel: () => Model;
    setModel: (model: Model) => void;
}

export const useRelationsState = create<RelationStates>((set, get) => ({
    relations: [],
    selectedRelationsIndex: undefined,

    getRelation: (relationId: string) => get().relations.find((rel) => rel.id === relationId),

    showRelation: async (relation: Relation) => {
        return get().showRelationByName(relation.connectionId, relation.database, relation.schema, relation.name);
    },
    showRelationByName: async (connectionId: string, databaseName: string, schemaName: string, relationName: string) => {

        const relationId = getRelationId(relationName, databaseName, schemaName, connectionId);

        // check if relation already exists
        const existingRelation = get().relations.find((rel) => rel.id === relationId);
        if (existingRelation) {
            focusRelationInLayout(get().layoutModel, existingRelation.id);
        } else {

            const defaultQueryParams = getDefaultQueryParams();
            const view = await getViewFromRelationName(connectionId, databaseName, schemaName, relationName, defaultQueryParams);

            set((state) => ({
                relations: [...state.relations, {...view}],
            }));

            const model = get().layoutModel;
            addRelationToLayout(model, view);
        }
    },

    updateRelationDisplay: async (relationId, query) => {
        const relation = get().relations.find((rel) => rel.id === relationId);
        if (!relation) {
            console.error(`Relation with id ${relationId} not found`);
            return;
        }

        const updatedRelation = await getViewFromRelation(relation, query);
        set((state) => ({
            relations: state.relations.map((rel) => {
                if (rel.id === relationId) {
                    return updatedRelation;
                }
                return rel;
            }),
        }));
    },

    closeRelation: (relationId: string) => {
        set((state) => ({
            relations: state.relations.filter((rel: RelationState) => rel.id !== relationId),
        }));

        console.log('Open relations:', get().relations);
    },

    getModel: () => get().layoutModel,
    setModel: (model: Model) =>
        set(() => ({
                layoutModel: model,
            }),
        ),

    layoutModel: getInitialLayoutModel({relations: []}),
}));
