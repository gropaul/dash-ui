import {RelationState} from "@/model/relation-state";
import {RelationEvents} from "@/state/relations/event/relation-events";
import {ParameterDefinition} from "@/model/relation-view-state/parameters";

/**
 * Compares old and new relation state and dispatches the appropriate
 * relation events when relevant fields change.
 *
 * Use this to wrap an updateRelation callback so that macro registration
 * and other action subscribers stay in sync across all contexts
 * (standalone, workflow, dashboard).
 */
export function processRelationUpdateEvent(
    oldState: RelationState,
    newState: RelationState
): void {
    const oldQuery = oldState.query.baseQuery;
    const newQuery = newState.query.baseQuery;

    // SQL changed
    if (oldQuery !== newQuery) {
        RelationEvents.updateSql(oldState, newState);
    }

    // Rename (displayName changed but not SQL)
    const oldName = oldState.viewState.displayName;
    const newName = newState.viewState.displayName;
    if (oldName !== newName) {
        RelationEvents.updateDisplayName(oldState, newState);
    }

    // Parameters changed (defaults, types, descriptions)
    const oldParams = oldState.viewState.parametersState?.parameters;
    const newParams = newState.viewState.parametersState?.parameters;
    if (!parametersEqual(oldParams, newParams)) {
        RelationEvents.updateParams(oldState, newState);
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
