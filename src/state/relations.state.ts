import {v4 as uuidv4} from "uuid";
import {Relation} from "@/model/relation";
import {create} from "zustand";
import {Model} from "flexlayout-react";
import {addRelationToLayout, getInitialModel} from "@/state/relations/layout-updates";

interface RelationViewState extends Relation {

}

interface RelationState {
    relations: RelationViewState[],

    addRelation: (relation: Relation) => void,
    addRelations: (relations: Relation[]) => void,
    removeRelation: (relation: RelationViewState) => void,

    layoutModel: Model;
    getModel: () => Model;
    setModel: (model: Model) => void;
}

export const useRelationsState = create<RelationState>((set, get) => ({
    relations: [],
    selectedRelationsIndex: undefined,
    addRelation: (relation: Relation) => {
        set((state) => ({
            relations: [...state.relations, {...relation, tabId: uuidv4()}],
        }));

        const model = get().layoutModel;
        addRelationToLayout(model, relation);
    },

    addRelations: (relations: Relation[]) => {
        relations.forEach((relation) => get().addRelation(relation));
    },

    removeRelation: (relationToRemove: RelationViewState) => {
        set((state) => ({
            relations: state.relations.filter((rel: RelationViewState) => rel.id !== relationToRemove.id),
        }));
    },

    getModel: () => get().layoutModel,
    setModel: (model: Model) =>
        set(() => ({
                layoutModel: model,
            }),
        ),

    layoutModel: getInitialModel({relations: []}),
}));
