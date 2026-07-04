import {useRelationsState} from "@/state/relations.state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {DashboardState} from "@/model/dashboard-state";
import {RelationState, TaskExecutionState} from "@/model/relation-state";

/** Unique relation ids referenced by the dashboard's relation widgets (same relation may appear twice). */
export function dashboardRelationIds(dashboard: DashboardState): string[] {
    const ids = Object.values(dashboard.widgets ?? {})
        .filter(w => w.type === 'relation' && w.relationId)
        .map(w => w.relationId!);
    return Array.from(new Set(ids));
}

function runActionsFor(relation: RelationState) {
    const {updateRelation} = useRelationsState.getState();
    return getRelationActions({mode: 'embedded', relationState: relation, updateRelation});
}

/** Run every referenced relation's query one after another (sequential, in insertion order). */
export async function runAllDashboardQueries(dashboard: DashboardState): Promise<void> {
    for (const relationId of dashboardRelationIds(dashboard)) {
        // Read fresh each iteration — earlier runs mutate the store.
        const relation = useRelationsState.getState().relations[relationId];
        if (!relation) continue;
        await runActionsFor(relation).updateRelationDataWithBaseQuery(relation.query.baseQuery);
    }
}

export function cancelAllDashboardQueries(dashboard: DashboardState): void {
    for (const relationId of dashboardRelationIds(dashboard)) {
        const relation = useRelationsState.getState().relations[relationId];
        if (!relation || relation.executionState.state !== 'running') continue;
        void runActionsFor(relation).cancelQuery();
    }
}

/** Aggregate execution state across all referenced relations, for the header run button + border. */
export function getDashboardExecutionState(
    dashboard: DashboardState,
    relations: Record<string, RelationState>,
): TaskExecutionState {
    const states = dashboardRelationIds(dashboard)
        .map(id => relations[id]?.executionState)
        .filter((s): s is TaskExecutionState => Boolean(s));

    if (states.some(s => s.state === 'running')) return {state: 'running'};
    const error = states.find(s => s.state === 'error');
    if (error) return error;
    if (states.length > 0 && states.every(s => s.state === 'success')) return {state: 'success'};
    return {state: 'not-started'};
}
