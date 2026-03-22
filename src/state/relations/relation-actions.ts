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

export type RelationActionType =
    | 'CREATE'      // New relation created
    | 'DELETE'      // Relation deleted
    | 'RENAME'      // Relation renamed
    | 'UPDATE_SQL'; // SQL query changed

interface RelationActionBase {
    type: RelationActionType;
    relationId: string;
    relationName: string;
}

export interface RelationCreateAction extends RelationActionBase {
    type: 'CREATE';
    sql: string;
}

export interface RelationDeleteAction extends RelationActionBase {
    type: 'DELETE';
}

export interface RelationRenameAction extends RelationActionBase {
    type: 'RENAME';
    oldName: string;
    sql: string;
}

export interface RelationUpdateSqlAction extends RelationActionBase {
    type: 'UPDATE_SQL';
    sql: string;
}

export type RelationAction =
    | RelationCreateAction
    | RelationDeleteAction
    | RelationRenameAction
    | RelationUpdateSqlAction;

export type RelationActionListener = (action: RelationAction) => void;

// Internal state
const listeners = new Set<RelationActionListener>();

/**
 * Subscribe to relation actions.
 * @returns Unsubscribe function
 */
export function onRelationAction(listener: RelationActionListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Dispatch a relation action to all subscribers.
 */
export function dispatchRelationAction(action: RelationAction): void {
    for (const listener of listeners) {
        try {
            listener(action);
        } catch (error) {
            console.error('Error in relation action listener:', error);
        }
    }
}

// Helper functions for common actions
export const RelationActions = {
    create(relationId: string, relationName: string, sql: string): void {
        dispatchRelationAction({ type: 'CREATE', relationId, relationName, sql });
    },

    delete(relationId: string, relationName: string): void {
        dispatchRelationAction({ type: 'DELETE', relationId, relationName });
    },

    rename(relationId: string, oldName: string, newName: string, sql: string): void {
        dispatchRelationAction({ type: 'RENAME', relationId, relationName: newName, oldName, sql });
    },

    updateSql(relationId: string, relationName: string, sql: string): void {
        dispatchRelationAction({ type: 'UPDATE_SQL', relationId, relationName, sql });
    },
};
