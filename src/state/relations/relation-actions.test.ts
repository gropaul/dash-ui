import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    onRelationAction,
    dispatchRelationAction,
    RelationActions,
    RelationAction,
} from './relation-actions';

describe('relation-actions', () => {
    describe('onRelationAction', () => {
        it('should subscribe and receive dispatched actions', () => {
            const listener = vi.fn();
            const unsubscribe = onRelationAction(listener);

            dispatchRelationAction({
                type: 'CREATE',
                relationId: 'test-id',
                relationName: 'test',
                sql: 'SELECT 1',
            });

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith({
                type: 'CREATE',
                relationId: 'test-id',
                relationName: 'test',
                sql: 'SELECT 1',
            });

            unsubscribe();
        });

        it('should unsubscribe correctly', () => {
            const listener = vi.fn();
            const unsubscribe = onRelationAction(listener);

            unsubscribe();

            dispatchRelationAction({
                type: 'DELETE',
                relationId: 'test-id',
                relationName: 'test',
            });

            expect(listener).not.toHaveBeenCalled();
        });

        it('should support multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            const unsub1 = onRelationAction(listener1);
            const unsub2 = onRelationAction(listener2);

            dispatchRelationAction({
                type: 'DELETE',
                relationId: 'test-id',
                relationName: 'test',
            });

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);

            unsub1();
            unsub2();
        });

        it('should handle listener errors gracefully', () => {
            const errorListener = vi.fn(() => {
                throw new Error('Listener error');
            });
            const normalListener = vi.fn();

            const unsub1 = onRelationAction(errorListener);
            const unsub2 = onRelationAction(normalListener);

            // Should not throw
            dispatchRelationAction({
                type: 'DELETE',
                relationId: 'test-id',
                relationName: 'test',
            });

            // Both listeners should be called despite error
            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();

            unsub1();
            unsub2();
        });
    });

    describe('RelationActions helpers', () => {
        let receivedActions: RelationAction[];
        let unsubscribe: () => void;

        beforeEach(() => {
            receivedActions = [];
            unsubscribe = onRelationAction((action) => {
                receivedActions.push(action);
            });
        });

        afterEach(() => {
            unsubscribe();
        });

        it('should dispatch CREATE action', () => {
            RelationActions.create('id-1', 'my_relation', 'SELECT * FROM users');

            expect(receivedActions).toHaveLength(1);
            expect(receivedActions[0]).toEqual({
                type: 'CREATE',
                relationId: 'id-1',
                relationName: 'my_relation',
                sql: 'SELECT * FROM users',
            });
        });

        it('should dispatch DELETE action', () => {
            RelationActions.delete('id-1', 'my_relation');

            expect(receivedActions).toHaveLength(1);
            expect(receivedActions[0]).toEqual({
                type: 'DELETE',
                relationId: 'id-1',
                relationName: 'my_relation',
            });
        });

        it('should dispatch RENAME action', () => {
            RelationActions.rename('id-1', 'old_name', 'new_name', 'SELECT 1');

            expect(receivedActions).toHaveLength(1);
            expect(receivedActions[0]).toEqual({
                type: 'RENAME',
                relationId: 'id-1',
                relationName: 'new_name',
                oldName: 'old_name',
                sql: 'SELECT 1',
            });
        });

        it('should dispatch UPDATE_SQL action', () => {
            RelationActions.updateSql('id-1', 'my_relation', 'SELECT 2');

            expect(receivedActions).toHaveLength(1);
            expect(receivedActions[0]).toEqual({
                type: 'UPDATE_SQL',
                relationId: 'id-1',
                relationName: 'my_relation',
                sql: 'SELECT 2',
            });
        });
    });
});
