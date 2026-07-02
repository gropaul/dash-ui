/**
 * Migration: v1 — Flatten RelationState into state.relations
 *
 * # What changed
 * Prior to this migration, `RelationState` objects were stored in three places:
 *   1. `state.relations`                                   (top-level / standalone)
 *   2. `state.canvas[id].nodes[*].data.relationData`       (embedded in XyFlow canvas nodes)
 *   3. `state.dashboards[id].elementState.blocks[*].data`  (embedded in Editor.js dashboard blocks)
 *
 * After this migration every `RelationState` lives exclusively in `state.relations`.
 * Canvas nodes store `{ relationId: string }` and dashboard blocks store `{ id: string }`.
 *
 * # Editor tree changes
 * Relations extracted from canvas nodes are added as siblings of the canvas
 * in the editor tree (not as children). Canvas nodes remain leaf nodes.
 *
 * # How to detect old state
 * - Canvas node: `node.data.relationData` exists and has a `viewState` property.
 * - Dashboard block: `block.data` has a `viewState` property (`isRelationState`-like check).
 *
 * # Idempotent
 * Already-migrated state (nodes with `relationId`, blocks with only `id`) passes through
 * unchanged because the `'viewState' in data` guard only matches the old embedded format.
 */

export interface MigratableRelationsState {
    relations?: Record<string, any>;
    canvas?: Record<string, { nodes?: any[] }>;
    dashboards?: Record<string, { elementState?: { blocks?: any[] } }>;
    editorElements?: any[];
}

/**
 * Apply the v1 migration in-place on a raw rehydrated state object.
 *
 * Called once during Zustand `onRehydrateStorage` before the store becomes live.
 * Mutates `state` directly to avoid an extra clone.
 */
export function migrateV1FlattenRelationState(state: MigratableRelationsState): void {
    if (!state.relations) state.relations = {};

    // Collect relation IDs extracted from each canvas (keyed by canvas ID)
    const canvasRelationIds = new Map<string, {id: string; name: string}[]>();

    // ── Canvas nodes ──────────────────────────────────────────────────────────
    // Old format: node.data = { relationData: RelationState }
    // New format: node.data = { relationId: string }
    for (const [canvasId, canvas] of Object.entries(state.canvas ?? {})) {
        for (const node of canvas.nodes ?? []) {
            const data = node.data;
            if (data?.relationData && typeof data.relationData === 'object' && 'viewState' in data.relationData) {
                const relation = data.relationData;
                state.relations[relation.id] = relation;
                node.data = {relationId: relation.id};

                if (!canvasRelationIds.has(canvasId)) canvasRelationIds.set(canvasId, []);
                canvasRelationIds.get(canvasId)!.push({
                    id: relation.id,
                    name: relation.viewState?.displayName ?? 'Relation',
                });
            }
        }
    }

    // ── Dashboard blocks ──────────────────────────────────────────────────────
    // Old format: block.data = RelationState (has `viewState` property)
    // New format: block.data = { id: string }
    for (const dashboard of Object.values(state.dashboards ?? {})) {
        for (const block of dashboard.elementState?.blocks ?? []) {
            if (block.data && typeof block.data === 'object' && 'viewState' in block.data) {
                const relation = block.data;
                state.relations[relation.id] = relation;
                block.data = {id: relation.id};
            }
        }
    }

    // ── Editor tree ───────────────────────────────────────────────────────────
    // Add extracted canvas relations as siblings of the canvas node in the tree.
    if (state.editorElements && canvasRelationIds.size > 0) {
        state.editorElements = migrateEditorElements(state.editorElements, canvasRelationIds);
    }
}

function migrateEditorElements(elements: any[], canvasRelationIds: Map<string, {id: string; name: string}[]>): any[] {
    const result: any[] = [];

    for (const el of elements) {
        // Recurse into folders
        if (el.children && Array.isArray(el.children)) {
            result.push({...el, children: migrateEditorElements(el.children, canvasRelationIds)});
        } else {
            result.push(el);
        }

        // If this is a canvas node, insert its relations as siblings right after it
        if (el.type === 'canvas' && canvasRelationIds.has(el.id)) {
            const relations = canvasRelationIds.get(el.id)!;
            for (const rel of relations) {
                result.push({
                    id: rel.id,
                    name: rel.name,
                    type: 'relations',
                    children: null,
                });
            }
        }
    }

    return result;
}
