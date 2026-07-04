/**
 * Migration: v2 — EditorJS dashboards → grid dashboards (clean break)
 *
 * # What changed
 * Dashboards were EditorJS documents: `DashboardState.elementState: OutputData`.
 * They are now react-grid-layout grids: `{ widgets, layouts, gridConfig }`.
 *
 * # Behaviour (agreed: clean break, no content conversion)
 * Any dashboard still in the old shape (has no `widgets`) is reset to an EMPTY grid, keeping
 * its `id`, `name` and `viewState`. Old `elementState` is dropped. The underlying relations are
 * NOT lost — the v1 migration (run first) already extracted them into `state.relations`; only the
 * dashboard layout resets.
 *
 * # Idempotent
 * Dashboards that already have `widgets` are left untouched, so re-running is a no-op.
 *
 * Runs in Zustand `onRehydrateStorage`, in-place, AFTER migrateV1FlattenRelationState.
 */
import {
    DEFAULT_DASHBOARD_GRID_CONFIG,
    getEmptyDashboardLayouts,
    getInitDashboardViewState,
} from "@/model/dashboard-state";

export interface MigratableDashboardsState {
    dashboards?: Record<string, any>;
}

export function migrateDashboardsToGrid(state: MigratableDashboardsState): void {
    if (!state.dashboards) return;

    for (const [id, dashboard] of Object.entries(state.dashboards)) {
        if (!dashboard || typeof dashboard !== 'object') continue;
        // Already migrated → leave as-is (idempotent).
        if ('widgets' in dashboard && dashboard.widgets) continue;

        const name: string = dashboard.name ?? "Dashboard";
        state.dashboards[id] = {
            id,
            name,
            viewState: dashboard.viewState ?? getInitDashboardViewState(name),
            widgets: {},
            layouts: getEmptyDashboardLayouts(),
            gridConfig: {...DEFAULT_DASHBOARD_GRID_CONFIG},
        };
    }
}
