import {RelationState} from "@/model/relation-state";

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
 */

export type RelationEventType =
    | 'CREATE'        // New relation created
    | 'DELETE'        // Relation deleted
    | 'RENAME'        // Relation renamed
    | 'UPDATE_SQL'    // SQL query changed
    | 'UPDATE_PARAMS'; // Parameters changed

export interface RelationEvent {
    type: RelationEventType;
    old?: RelationState;
    new?: RelationState;
}

export type RelationEventListener = (event: RelationEvent) => void;

// Internal state
const listeners = new Set<{ listener: RelationEventListener; types?: RelationEventType[] }>();

/**
 * Subscribe to relation events.
 * @param listener - Callback for events
 * @param types - Optional list of event types to subscribe to. If omitted, receives all events.
 * @returns Unsubscribe function
 */
export function onRelationEvent(listener: RelationEventListener, types?: RelationEventType[]): () => void {
    const entry = { listener, types };
    listeners.add(entry);
    return () => {
        listeners.delete(entry);
    };
}

/**
 * Dispatch a relation event to all subscribers.
 */
function dispatchRelationEvent(event: RelationEvent): void {
    for (const entry of listeners) {
        if (entry.types && !entry.types.includes(event.type)) continue;
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

    updateDisplayName(oldState: RelationState, newState: RelationState): void {
        dispatchRelationEvent({ type: 'RENAME', old: oldState, new: newState });
    },

    updateSql(oldState: RelationState, newState: RelationState): void {
        dispatchRelationEvent({ type: 'UPDATE_SQL', old: oldState, new: newState });
    },

    updateParams(oldState: RelationState, newState: RelationState): void {
        dispatchRelationEvent({ type: 'UPDATE_PARAMS', old: oldState, new: newState });
    },
};
