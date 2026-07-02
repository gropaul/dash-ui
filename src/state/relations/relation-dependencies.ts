import {useRelationsState} from "@/state/relations.state";
import {isInteractiveBlock} from "@/components/editor/inputs/input-manager";

export interface CanvasDependency {
    canvasId: string;
    canvasName: string;
    nodeIds: string[];
}

export interface DashboardDependency {
    dashboardId: string;
    dashboardName: string;
    blockIds: string[];
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
    /** Dashboard block IDs to exclude */
    dashboardBlockIds?: Set<string>;
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
        const matchingBlocks = (dashboard.elementState?.blocks ?? [])
            .filter(b => {
                if (!b.id || !isInteractiveBlock(b.type) || b.data?.id !== relationId) return false;
                return !exclude?.dashboardBlockIds?.has(b.id);
            });
        if (matchingBlocks.length > 0) {
            dashboards.push({
                dashboardId,
                dashboardName: dashboard.viewState.displayName,
                blockIds: matchingBlocks.map(b => b.id!),
            });
        }
    }

    const totalRefs = canvases.reduce((sum, c) => sum + c.nodeIds.length, 0)
        + dashboards.reduce((sum, d) => sum + d.blockIds.length, 0);

    return {
        canvases,
        dashboards,
        totalRefs,
        isOrphan: totalRefs === 0,
    };
}
