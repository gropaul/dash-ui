import { RelationState } from "@/model/relation-state";
import { RelationActions } from "@/state/relations/relation-actions";
import { ParameterDefinition } from "@/model/relation-view-state/parameters";

/**
 * Compares old and new relation state and dispatches the appropriate
 * RelationActions when relevant fields change.
 *
 * Use this to wrap an updateRelation callback so that macro registration
 * and other action subscribers stay in sync across all contexts
 * (standalone, workflow, dashboard).
 */
export function dispatchRelationChanges(
    oldState: RelationState,
    newState: RelationState
): void {
    const name = newState.viewState.displayName;
    const oldQuery = oldState.query.baseQuery;
    const newQuery = newState.query.baseQuery;
    const oldParams = oldState.viewState.parametersState?.parameters;
    const newParams = newState.viewState.parametersState?.parameters;

    // SQL changed
    if (oldQuery !== newQuery) {
        RelationActions.updateSql(newState.id, name, newQuery, newParams);
        return;
    }

    // Parameters changed (defaults, types, descriptions)
    if (!parametersEqual(oldParams, newParams)) {
        RelationActions.updateParams(newState.id, name, newQuery, newParams ?? []);
    }
}

function parametersEqual(
    a: ParameterDefinition[] | undefined,
    b: ParameterDefinition[] | undefined
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((p, i) =>
        p.name === b[i].name &&
        p.defaultValue === b[i].defaultValue &&
        p.type === b[i].type &&
        p.description === b[i].description
    );
}
