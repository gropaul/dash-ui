import {v4 as uuidv4} from "uuid";
import {getRelationId, Relation} from "@/model/relation";
import {create} from "zustand";
import {Model} from "flexlayout-react";
import {addRelationToLayout, focusRelationInLayout, getInitialLayoutModel} from "@/state/relations/layout-updates";
import {getViewFromRelationName, RelationViewState} from "@/model/relation-view-state";


interface RelationState {

    relations: RelationViewState[],

    showRelation: (connectionId: string, databaseName: string | undefined, relationName: string) => Promise<void>,
    getRelation: (relationId: string) => RelationViewState | undefined,
    updateRelationDisplayRange: (relationId: string, offset: number, limit: number) => Promise<void>,
    closeRelation: (relationId: string) => void,

    layoutModel: Model;
    getModel: () => Model;
    setModel: (model: Model) => void;
}

export const useRelationsState = create<RelationState>((set, get) => ({
    relations: [],
    selectedRelationsIndex: undefined,

    getRelation: (relationId: string) => get().relations.find((rel) => rel.id === relationId),

    showRelation: async (connectionId, databaseName, relationName) => {

        const relationId = getRelationId(relationName, databaseName, connectionId);

        // check if relation already exists
        const existingRelation = get().relations.find((rel) => rel.id === relationId);
        if (existingRelation) {
            focusRelationInLayout(get().layoutModel, existingRelation.id);
        } else {

            const view = await getViewFromRelationName(relationName, databaseName, connectionId);

            set((state) => ({
                relations: [...state.relations, {...view}],
            }));

            const model = get().layoutModel;
            addRelationToLayout(model, view);
        }
    },

    updateRelationDisplayRange: async (relationId: string, offset: number, limit: number) => {
        const relation = get().relations.find((rel) => rel.id === relationId);
        if (!relation) {
            console.error(`Relation with id ${relationId} not found`);
            return;
        }

        const updatedRelation = await getViewFromRelationName(relation.name, relation.database, relation.connectionId, offset, limit);
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
            relations: state.relations.filter((rel: RelationViewState) => rel.id !== relationId),
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
