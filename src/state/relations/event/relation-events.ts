import {RelationState} from "@/model/relation-state";
import {ConnectionsService} from "@/state/connections/connections-service";

/**
 * Relation Events API
 *
 * Centralized system for relation lifecycle events. Components can subscribe
 * to events and react accordingly (e.g., macro registration, cache invalidation).
 *
 * Usage:
 *   const unsubscribe = onRelationEvent((event) => {
 *     if (event.type === 'CREATE') { ... }
 *   });
 *
 *   // Or subscribe to specific event types only:
 *   const unsubscribe = onRelationEvent((event) => { ... }, ['CREATE', 'DELETE']);
 *
 *   // Or subscribe to events for a specific relation:
 *   const unsubscribe = onRelationEvent((event) => { ... }, undefined, relationId);
 */

export type RelationEventType =
    | 'CREATE'        // New relation created
    | 'DELETE'        // Relation deleted
    | 'RENAME'        // Relation renamed
    | 'QUERY_RUN_FINISHED'     // Relation query executed
    | 'UPDATE_SQL'    // SQL query changed
    | 'UPDATE_PARAMS' // Parameters changed
    | 'UPDATE_SELECTION'; // View selection changed (e.g. dropdown, table row, chart point)

export interface RelationEvent {
    type: RelationEventType;
    old?: RelationState;
    new?: RelationState;
}

export type RelationEventListener = (event: RelationEvent) => void;

// Internal state
const listeners = new Set<{ listener: RelationEventListener; types?: RelationEventType[]; relationId?: string }>();

/**
 * Subscribe to relation events.
 * @param listener - Callback for events
 * @param types - Optional list of event types to subscribe to. If omitted, receives all events.
 * @param relationId - Optional relation ID to filter on. If omitted, receives events for all relations.
 * @returns Unsubscribe function
 */
export function onRelationEvent(listener: RelationEventListener, types?: RelationEventType[], relationId?: string): () => void {
    const entry = { listener, types, relationId };
    listeners.add(entry);
    return () => {
        listeners.delete(entry);
    };
}

/**
 * Dispatch a relation event to all subscribers.
 */
function dispatchRelationEvent(event: RelationEvent): void {
    const eventRelationId = event.new?.id ?? event.old?.id;
    if (!ConnectionsService.getInstance().hasDatabaseConnection()){
        throw new Error('No database connection available');
    }
    for (const entry of listeners) {
        if (entry.types && !entry.types.includes(event.type)) continue;
        if (entry.relationId && entry.relationId !== eventRelationId) continue;
        try {
            entry.listener(event);
        } catch (error) {
            console.error('Error in relation event listener:', error);
        }
    }
}

// Helper functions for common events
export const RelationEvents = {
    create(state: RelationState): void {
        dispatchRelationEvent({ type: 'CREATE', new: state });
    },

    delete(state: RelationState): void {
        dispatchRelationEvent({ type: 'DELETE', old: state });
    },

    // This event will fire after a query is executed, and the relation state is updated with new data
    queryRunFinished(state: RelationState): void {
        dispatchRelationEvent({ type: 'QUERY_RUN_FINISHED', old: state, new: state });
    },

    updateDisplayName(oldState: RelationState, newState: RelationState): void {
        dispatchRelationEvent({ type: 'RENAME', old: oldState, new: newState });
    },

    updateSql(oldState: RelationState, newState: RelationState): void {
        dispatchRelationEvent({ type: 'UPDATE_SQL', old: oldState, new: newState });
    },

    updateParams(oldState: RelationState, newState: RelationState): void {
        dispatchRelationEvent({ type: 'UPDATE_PARAMS', old: oldState, new: newState });
    },

    updateSelection(oldState: RelationState, newState: RelationState): void {
        dispatchRelationEvent({ type: 'UPDATE_SELECTION', old: oldState, new: newState });
    },
};
