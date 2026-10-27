import type {Edge} from '@xyflow/react';
import {
    executeQueryOfRelation,
    RelationState,
    returnEmptyErrorState,
    setRelationRunning,
} from '@/model/relation-state';
import {sanitizeMacroName} from '@/platform/sql-utils';
import {extractMacroRefs} from './table-macros';

/**
 * All downstream relation ids in topological (BFS) order.
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

/**
 * Build the relation dependency graph from SQL alone — no canvas required.
 *
 * Mirrors what the canvas draws as edges (`refEdges` in canvas-file.ts): a relation that references
 * `refs.<name>()` in its SQL depends on the relation whose display name sanitizes to `<name>`.
 * Returns {source → target} edges (source is upstream, target depends on it).
 */
function buildRelationEdges(relations: Record<string, RelationState>): Edge[] {
    const idByMacro = new Map<string, string>();
    for (const r of Object.values(relations)) {
        idByMacro.set(sanitizeMacroName(r.viewState.displayName), r.id);
    }

    const edges: Edge[] = [];
    for (const r of Object.values(relations)) {
        for (const ref of extractMacroRefs(r.query.baseQuery)) {
            const sourceId = idByMacro.get(ref);
            if (sourceId && sourceId !== r.id) {
                edges.push({id: `${sourceId}->${r.id}`, source: sourceId, target: r.id});
            }
        }
    }
    return edges;
}

/**
 * Re-runs every relation of `getRelations()` downstream of `relationId`, sequentially in topological order. Uses
 * `update` and `executeQueryOfRelation` directly, so it doesn't dispatch relation events again: no feedback loop.
 */
export async function refreshDownstreamIn(
    relationId: string,
    getRelations: () => Record<string, RelationState>,
    update: (relation: RelationState) => void,
): Promise<void> {
    const queue = getDownstreamQueue(relationId, buildRelationEdges(getRelations()));
    if (queue.length === 0) return;

    for (const downstreamId of queue) {
        const relation = getRelations()[downstreamId];
        if (!relation) continue;
        try {
            update(setRelationRunning(relation));
            const executed = await executeQueryOfRelation({...relation});
            update(executed);
        } catch (e) {
            update(returnEmptyErrorState(setRelationRunning(relation), e));
        }
    }
}
