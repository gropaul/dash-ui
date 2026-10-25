import {useRelationsState} from "@/state/relations.state";
import {CanvasState} from "@/model/canvas-state";
import {countRelationReferences, DashboardState, removeRelationReferences} from "@/model/dashboard-state";

export interface CanvasDependency {
    canvasId: string;
    canvasName: string;
    nodeIds: string[];
}

export interface DashboardDependency {
    dashboardId: string;
    dashboardName: string;
    /** How many blocks of the dashboard show the relation. */
    blockCount: number;
}

export interface RelationDependencies {
    canvases: CanvasDependency[];
    dashboards: DashboardDependency[];
    /** Total number of references across all canvases and dashboards */
    totalRefs: number;
    /** True if the relation is not referenced by any canvas or dashboard */
    isOrphan: boolean;
}

export interface ExcludeRefs {
    /** Canvas node IDs to exclude (e.g., nodes being deleted) */
    canvasNodeIds?: Set<string>;
}

/**
 * Find all canvases and dashboards that reference a given relation.
 * Optionally exclude specific node/block IDs (useful when checking
 * dependencies after a node deletion that hasn't hit state yet).
 *
 * Reads directly from the Zustand store (no hooks).
 */
export function getRelationDependencies(relationId: string, exclude?: ExcludeRefs): RelationDependencies {
    const state = useRelationsState.getState();

    const canvases: CanvasDependency[] = [];
    for (const [canvasId, canvas] of Object.entries(state.canvas)) {
        const matchingNodes = canvas.nodes
            .filter(n => {
                if ((n.data as { relationId?: string }).relationId !== relationId) return false;
                return !exclude?.canvasNodeIds?.has(n.id);
            });
        if (matchingNodes.length > 0) {
            canvases.push({
                canvasId,
                canvasName: canvas.viewState.displayName,
                nodeIds: matchingNodes.map(n => n.id),
            });
        }
    }

    const dashboards: DashboardDependency[] = [];
    for (const [dashboardId, dashboard] of Object.entries(state.dashboards)) {
        const blockCount = countRelationReferences(dashboard.markdown ?? '', relationId);
        if (blockCount > 0) {
            dashboards.push({dashboardId, dashboardName: dashboard.viewState.displayName, blockCount});
        }
    }

    const totalRefs = canvases.reduce((sum, c) => sum + c.nodeIds.length, 0)
        + dashboards.reduce((sum, d) => sum + d.blockCount, 0);

    return {
        canvases,
        dashboards,
        totalRefs,
        isOrphan: totalRefs === 0,
    };
}

/**
 * Remove every reference to the given relation(s) from the dashboards and canvas collections:
 * dashboard blocks showing them and canvas nodes (plus any edges connected to those nodes).
 * Pure — returns new collections; only the dashboards/canvases that actually changed are cloned,
 * the rest are shared by reference.
 */
export function purgeRelationReferences(
    dashboards: Record<string, DashboardState>,
    canvas: Record<string, CanvasState>,
    relationIds: Set<string>,
): { dashboards: Record<string, DashboardState>; canvas: Record<string, CanvasState> } {
    const nextDashboards: Record<string, DashboardState> = {...dashboards};
    for (const [id, dashboard] of Object.entries(dashboards)) {
        const markdown = removeRelationReferences(dashboard.markdown ?? '', relationIds);
        if (markdown === (dashboard.markdown ?? '')) continue;
        nextDashboards[id] = {...dashboard, markdown, lastEditedAt: Date.now()};
    }

    const nextCanvas: Record<string, CanvasState> = {...canvas};
    for (const [id, c] of Object.entries(canvas)) {
        const removed = new Set(
            c.nodes
                .filter(n => {
                    const rid = (n.data as { relationId?: string }).relationId;
                    return rid != null && relationIds.has(rid);
                })
                .map(n => n.id),
        );
        if (removed.size === 0) continue;

        const nodes = c.nodes.filter(n => !removed.has(n.id));
        // drop edges dangling off a removed node
        const edges = c.edges.filter(e => !removed.has(e.source) && !removed.has(e.target));
        nextCanvas[id] = {...c, nodes, edges, lastEditedAt: Date.now()};
    }

    return {dashboards: nextDashboards, canvas: nextCanvas};
}
