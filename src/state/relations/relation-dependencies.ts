import {useRelationsState} from "@/state/relations.state";

export interface CanvasDependency {
    canvasId: string;
    canvasName: string;
    nodeIds: string[];
}

export interface DashboardDependency {
    dashboardId: string;
    dashboardName: string;
    widgetIds: string[];
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
    /** Dashboard widget IDs to exclude */
    dashboardWidgetIds?: Set<string>;
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
        const matchingWidgets = Object.values(dashboard.widgets ?? {})
            .filter(w => {
                if (w.type !== 'relation' || w.relationId !== relationId) return false;
                return !exclude?.dashboardWidgetIds?.has(w.id);
            });
        if (matchingWidgets.length > 0) {
            dashboards.push({
                dashboardId,
                dashboardName: dashboard.viewState.displayName,
                widgetIds: matchingWidgets.map(w => w.id),
            });
        }
    }

    const totalRefs = canvases.reduce((sum, c) => sum + c.nodeIds.length, 0)
        + dashboards.reduce((sum, d) => sum + d.widgetIds.length, 0);

    return {
        canvases,
        dashboards,
        totalRefs,
        isOrphan: totalRefs === 0,
    };
}
