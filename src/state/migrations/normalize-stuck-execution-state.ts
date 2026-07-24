/**
 * Normalize stuck relation execution state on load.
 *
 * # Why
 * A relation's `executionState.state` can be `'running'` while its query is in flight. Because the
 * store persists on every `set()`, a relation that is mid-query when we persist gets written to disk
 * as `'running'`. On the next load nothing is actually executing, so such a relation would sit in the
 * loading state forever.
 *
 * # Behaviour
 * Any relation persisted as `'running'` is reset to the default idle state (`'not-started'`, the same
 * state a freshly created relation starts in). All other states (`'success'`, `'error'`, `'not-started'`)
 * are left untouched.
 *
 * # Idempotent
 * Relations that are not `'running'` are left as-is, so re-running is a no-op.
 *
 * Runs in Zustand `onRehydrateStorage`, in-place, alongside the other migrations.
 */
export interface NormalizableRelationsState {
    relations?: Record<string, any>;
}

export function normalizeStuckExecutionState(state: NormalizableRelationsState): void {
    if (!state.relations) return;

    for (const relation of Object.values(state.relations)) {
        if (!relation || typeof relation !== 'object') continue;
        if (relation.executionState?.state === 'running') {
            relation.executionState = {state: 'not-started'};
        }
    }
}
