import {RelationState} from "@/model/relation-state";
import {useRelationsState} from "@/state/relations.state";

export type RelationOrigin = 'relation';

export interface RelationWithOrigin {
    relation: RelationState;
    origin: RelationOrigin;
    updateRelation: (newRelation: RelationState) => void;
}

/**
 * Collect all RelationStates from the flat state.relations map.
 * All relations (standalone, canvas-embedded, dashboard-embedded) live here.
 * Reads directly from the zustand store (no hooks).
 */
export function getAllRelations(): RelationWithOrigin[] {
    const state = useRelationsState.getState();
    return Object.values(state.relations).map((relation) => ({
        relation,
        origin: 'relation' as const,
        updateRelation: (newRelation: RelationState) => {
            useRelationsState.getState().updateRelation(newRelation);
        },
    }));
}
