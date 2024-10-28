import create from "zustand";
import {v4 as uuidv4} from "uuid";
import {Relation} from "@/model/relation";

interface RelationState {
    relations: Relation[],
    selectedRelationsIndex?: number,

    addRelation: (relation: Relation) => void,
    addRelations: (relations: Relation[]) => void,
    selectRelation: (index: number) => void,
    removeRelation: (index: number) => void,
}

export const useRelationsState = create<RelationState>((set) => ({
    relations: [],
    selectedRelationsIndex: undefined,

    addRelation: (relation: Relation) =>
        set((state) => ({
            relations: [...state.relations, {...relation, id: uuidv4()}],
        })),
    addRelations: (relations: Relation[]) =>
        set((state) => ({
            relations: [...state.relations, ...relations.map((relation) => ({...relation, id: uuidv4()}))],
        })),

    selectRelation: (index: number) =>
        set(() => ({
            selectedRelationsIndex: index,
        })),

    removeRelation: (index: number) =>
        set((state) => ({
            relations: state.relations.filter((_, i) => i !== index),
            selectedRelationsIndex: state.selectedRelationsIndex === index ? undefined : state.selectedRelationsIndex,
        })),
}));
