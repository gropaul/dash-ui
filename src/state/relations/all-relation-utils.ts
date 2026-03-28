import { RelationState } from "@/model/relation-state";
import { useRelationsState } from "@/state/relations.state";
import { isRelationBlockData } from "@/components/editor/tools/utils";
import { getRandomId } from "@/platform/id-utils";

export type RelationOrigin = 'relation' | 'workflow' | 'dashboard';

export interface RelationWithOrigin {
    relation: RelationState;
    origin: RelationOrigin;
}

/**
 * Collect all RelationStates across top-level relations, workflow nodes, and dashboard blocks.
 * Reads directly from the zustand store (no hooks).
 */
export function getAllRelations(): RelationWithOrigin[] {
    const state = useRelationsState.getState();
    const result: RelationWithOrigin[] = [];

    // Top-level relations
    for (const relation of Object.values(state.relations)) {
        result.push({ relation, origin: 'relation' });
    }

    // Relations inside workflow nodes
    for (const workflow of Object.values(state.workflows)) {
        for (const node of workflow.nodes) {
            if (node.type === 'relationNode') {
                const relationData = (node.data as { relationData?: RelationState }).relationData;
                if (relationData) {
                    result.push({ relation: relationData, origin: 'workflow' });
                }
            }
        }
    }

    // Relations inside dashboard blocks
    for (const dashboard of Object.values(state.dashboards)) {
        const blocks = dashboard.elementState?.blocks;
        if (!blocks) continue;
        for (const block of blocks) {
            if (isRelationBlockData(block.data)) {
                result.push({ relation: block.data, origin: 'dashboard' });
            }
        }
    }

    return result;
}