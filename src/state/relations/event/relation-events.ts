import { ParameterDefinition } from "@/model/relation-view-state/parameters";

/**
 * Relation Actions API
 *
 * Centralized system for relation lifecycle events. Components can subscribe
 * to actions and react accordingly (e.g., macro registration, cache invalidation).
 *
 * Usage:
 *   // Subscribe to actions
 *   const unsubscribe = onRelationAction((action) => {
 *     if (action.type === 'CREATE') { ... }
 *   });
 *
 *   // Dispatch an action
 *   dispatchRelationAction({ type: 'CREATE', relationId: '...', relationName: '...', sql: '...' });
 */

export type RelationEventType =
    | 'CREATE'        // New relation created
    | 'DELETE'        // Relation deleted
    | 'RENAME'        // Relation renamed
    | 'UPDATE_SQL'    // SQL query changed
    | 'UPDATE_PARAMS'; // Parameters changed

interface RelationEventBase {
    type: RelationEventType;
    relationId: string;
    relationName: string;
}

export interface RelationCreateEvent extends RelationEventBase {
    type: 'CREATE';
    sql: string;
    parameters?: ParameterDefinition[];
}

export interface RelationDeleteEvent extends RelationEventBase {
    type: 'DELETE';
}

export interface RelationRenameEvent extends RelationEventBase {
    type: 'RENAME';
    oldName: string;
    sql: string;
    parameters?: ParameterDefinition[];
}

export interface RelationUpdateSqlEvent extends RelationEventBase {
    type: 'UPDATE_SQL';
    sql: string;
    parameters?: ParameterDefinition[];
}

export interface RelationUpdateParamsEvent extends RelationEventBase {
    type: 'UPDATE_PARAMS';
    sql: string;
    parameters: ParameterDefinition[];
}

export type RelationEvent =
    | RelationCreateEvent
    | RelationDeleteEvent
    | RelationRenameEvent
    | RelationUpdateSqlEvent
    | RelationUpdateParamsEvent;

export type RelationActionListener = (action: RelationEvent) => void;

// Internal state
const listeners = new Set<RelationActionListener>();

/**
 * Subscribe to relation actions.
 * @returns Unsubscribe function
 */
export function onRelationEvent(listener: RelationActionListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Dispatch a relation action to all subscribers.
 */
function dispatchRelationEvent(action: RelationEvent): void {
    for (const listener of listeners) {
        try {
            listener(action);
        } catch (error) {
            console.error('Error in relation action listener:', error);
        }
    }
}

// Helper functions for common actions
export const RelationEvents = {
    create(relationId: string, relationName: string, sql: string): void {
        dispatchRelationEvent({ type: 'CREATE', relationId, relationName, sql });
    },

    delete(relationId: string, relationName: string): void {
        dispatchRelationEvent({ type: 'DELETE', relationId, relationName });
    },

    rename(relationId: string, oldName: string, newName: string, sql: string): void {
        dispatchRelationEvent({ type: 'RENAME', relationId, relationName: newName, oldName, sql });
    },

    updateSql(relationId: string, relationName: string, sql: string, parameters?: ParameterDefinition[]): void {
        dispatchRelationEvent({ type: 'UPDATE_SQL', relationId, relationName, sql, parameters });
    },

    updateParams(relationId: string, relationName: string, sql: string, parameters: ParameterDefinition[]): void {
        dispatchRelationEvent({ type: 'UPDATE_PARAMS', relationId, relationName, sql, parameters });
    },
};
