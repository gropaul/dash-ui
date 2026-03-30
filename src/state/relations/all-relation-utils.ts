import {RelationState} from "@/model/relation-state";
import {useRelationsState} from "@/state/relations.state";
import {isRelationState} from "@/components/editor/tools/utils";
import {CanvasState} from "@/model/canvas-state";

export type RelationOrigin = 'relation' | 'canvas' | 'dashboard';

export interface RelationWithOrigin {
    relation: RelationState;
    origin: RelationOrigin;
    updateRelation: (newRelation: RelationState) => void;
}

/**
 * Collect all RelationStates across top-level relations, canvas nodes, and dashboard blocks.
 * Each entry includes an updateRelation callback for context-aware mutation.
 * Reads directly from the zustand store (no hooks).
 */
export function getAllRelations(): RelationWithOrigin[] {
    const state = useRelationsState.getState();
    const result: RelationWithOrigin[] = [];

    // Top-level relations
    for (const relation of Object.values(state.relations)) {
        result.push({
            relation,
            origin: 'relation',
            updateRelation: (newRelation) => {
                useRelationsState.getState().updateRelation(newRelation);
            },
        });
    }

    // Relations inside canvas nodes
    for (const [canvasId, canvas] of Object.entries(state.canvas)) {
        for (const node of canvas.nodes) {
            if (node.type === 'relationNode') {
                const relationData = (node.data as { relationData?: RelationState }).relationData;
                if (relationData) {
                    const nodeId = node.id;
                    result.push({
                        relation: relationData,
                        origin: 'canvas',
                        updateRelation: (newRelation) => {
                            const currentState = useRelationsState.getState();
                            const currentCanvas: CanvasState = currentState.canvas[canvasId];
                            if (!currentCanvas) return;
                            const newNodes = currentCanvas.nodes.map((n) => {
                                if (n.id !== nodeId) return n;
                                return {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        relationData: newRelation,
                                    }
                                };
                            });
                            currentState.updateCanvasState(canvasId, {nodes: newNodes});
                        },
                    });
                }
            }
        }
    }

    // Relations inside dashboard blocks
    for (const [dashboardId, dashboard] of Object.entries(state.dashboards)) {
        const blocks = dashboard.elementState?.blocks;
        if (!blocks) continue;
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
            const block = blocks[blockIndex];
            if (isRelationState(block.data)) {
                const idx = blockIndex;
                result.push({
                    relation: block.data,
                    origin: 'dashboard',
                    updateRelation: (newRelation) => {
                        const currentState = useRelationsState.getState();
                        const currentDashboard = currentState.dashboards[dashboardId];
                        if (!currentDashboard) return;
                        const currentBlocks = currentDashboard.elementState?.blocks;
                        if (!currentBlocks) return;
                        const newBlocks = currentBlocks.map((b, i) => {
                            if (i !== idx) return b;
                            return {...b, data: newRelation};
                        });
                        currentState.setDashboardStateUnsafe(dashboardId, {
                            ...currentDashboard,
                            elementState: {...currentDashboard.elementState, blocks: newBlocks},
                        });
                    },
                });
            }
        }
    }

    return result;
}
