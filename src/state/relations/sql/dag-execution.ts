import {Edge, Node} from '@xyflow/react';
import {
    executeQueryOfRelation,
    RelationState,
    returnEmptyErrorState,
    setRelationRunning,
} from '@/model/relation-state';
import {registerRelationMacro} from './table-macros';

type SetNodes = (updater: Node[] | ((nodes: Node[]) => Node[])) => void;
type SetEdges = (updater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
type GetNodes = () => Node[];
type GetEdges = () => Edge[];

/**
 * Get all downstream node IDs in topological (BFS) order.
 * Excludes the start node itself.
 */
export function getDownstreamQueue(startNodeId: string, edges: Edge[]): string[] {
    // Build adjacency: source → [targets]
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push(edge.target);
    }

    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    const order: string[] = [];

    while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        if (id !== startNodeId) order.push(id);
        for (const child of adj.get(id) ?? []) {
            queue.push(child);
        }
    }

    return order;
}

export type EdgeAnimationState = 'queued' | 'executing' | undefined;

/**
 * Clear animation state from all edges.
 */
function clearAllAnimations(setEdges: SetEdges) {
    setEdges((edges) =>
        edges.map((e) =>
            e.data?.animationState ? {...e, data: {...e.data, animationState: undefined}} : e
        )
    );
}

/**
 * Set all downstream edges to their animation states in one call.
 * Edges targeting the executing node get 'executing', edges targeting
 * queued nodes get 'queued', everything else is cleared.
 */
function setEdgeAnimationStates(
    executingNodeId: string,
    queuedNodeIds: Set<string>,
    setEdges: SetEdges,
) {
    setEdges((edges) =>
        edges.map((e) => {
            let newState: EdgeAnimationState;
            if (e.target === executingNodeId) {
                newState = 'executing';
            } else if (queuedNodeIds.has(e.target)) {
                newState = 'queued';
            } else {
                newState = undefined;
            }
            if (e.data?.animationState === newState) return e;
            return {...e, data: {...e.data, animationState: newState}};
        })
    );
}

/**
 * Update a canvas node's relation data.
 */
function updateNodeRelationData(
    nodeId: string,
    newRelation: RelationState,
    setNodes: SetNodes,
) {
    setNodes((nodes) =>
        nodes.map((n) => {
            if (n.id !== nodeId) return n;
            return {
                ...n,
                data: {
                    ...n.data,
                    relationData: newRelation,
                },
            };
        })
    );
}

/**
 * Get the relation data for a canvas node.
 */
function getNodeRelationData(nodeId: string, getNodes: GetNodes): RelationState | null {
    const node = getNodes().find(n => n.id === nodeId);
    if (!node || node.type !== 'relationNode') return null;
    const data = node.data as { relationData?: RelationState };
    return data?.relationData ?? null;
}

// Monotonically increasing run ID for cancellation
let currentRunId = 0;

export interface RefreshContext {
    getNodes: GetNodes;
    getEdges: GetEdges;
    setNodes: SetNodes;
    setEdges: SetEdges;
}

/**
 * Refresh all downstream nodes after a node's query has been executed.
 * Executes sequentially in topological order (DuckDB-WASM is single-threaded).
 *
 * Currently triggered only by query re-runs. Designed to support additional
 * trigger sources (parameter changes, widget selections) in the future.
 */
export async function refreshDownstream(
    startNodeId: string,
    ctx: RefreshContext,
): Promise<void> {
    const runId = ++currentRunId;
    const {getNodes, getEdges, setNodes, setEdges} = ctx;

    const queue = getDownstreamQueue(startNodeId, getEdges());
    if (queue.length === 0) return;

    for (const nodeId of queue) {
        // wait 1s for debug

        // Cancellation: if a new run started, clear all animations and stop
        if (runId !== currentRunId) {
            clearAllAnimations(setEdges);
            return;
        }

        const relation = getNodeRelationData(nodeId, getNodes);
        if (!relation) continue;

        // Mark current node as executing, remaining as queued
        const remainingQueued = new Set(queue.slice(queue.indexOf(nodeId) + 1));
        setEdgeAnimationStates(nodeId, remainingQueued, setEdges);

        const update = (newRelation: RelationState) => {
            updateNodeRelationData(nodeId, newRelation, setNodes);
        };


        try {
            // Set loading state
            const loadingState = setRelationRunning(relation);
            update(loadingState);

            // Execute the query
            const executed = await executeQueryOfRelation({...relation}, undefined);
            update(executed);

            // Register the macro so further downstream nodes can use it
            const displayName = relation.viewState.displayName;
            const params = relation.viewState.parametersState?.parameters;
            await registerRelationMacro(displayName, relation.query.baseQuery, params);
        } catch (e) {
            const errorState = returnEmptyErrorState(setRelationRunning(relation), e);
            update(errorState);
        }
    }

    // Clear all animations when done
    clearAllAnimations(setEdges);
}
