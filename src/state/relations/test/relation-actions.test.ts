import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    onRelationEvent,
    RelationEvents,
    RelationEvent,
} from '../event/relation-events';

describe('relation-actions', () => {
    describe('onRelationAction', () => {
        it('should subscribe and receive dispatched actions', () => {
            const listener = vi.fn();
            const unsubscribe = onRelationEvent(listener);

            RelationEvents.create('test-id', 'test', 'SELECT 1');


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
            const unsubscribe = onRelationEvent(listener);

            unsubscribe();
            RelationEvents.delete('test-id','test');


            expect(listener).not.toHaveBeenCalled();
        });

        it('should support multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            const unsub1 = onRelationEvent(listener1);
            const unsub2 = onRelationEvent(listener2);

            RelationEvents.delete('test-id','test');

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

            const unsub1 = onRelationEvent(errorListener);
            const unsub2 = onRelationEvent(normalListener);

            // Should not throw
            RelationEvents.delete('test-id','test');

            // Both listeners should be called despite error
            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();

            unsub1();
            unsub2();
        });
    });

    describe('RelationActions helpers', () => {
        let receivedActions: RelationEvent[];
        let unsubscribe: () => void;

        beforeEach(() => {
            receivedActions = [];
            unsubscribe = onRelationEvent((action) => {
                receivedActions.push(action);
            });
        });

        afterEach(() => {
            unsubscribe();
        });

        it('should dispatch CREATE action', () => {
            RelationEvents.create('id-1', 'my_relation', 'SELECT * FROM users');

            expect(receivedActions).toHaveLength(1);
            expect(receivedActions[0]).toEqual({
                type: 'CREATE',
                relationId: 'id-1',
                relationName: 'my_relation',
                sql: 'SELECT * FROM users',
            });
        });

        it('should dispatch DELETE action', () => {
            RelationEvents.delete('id-1', 'my_relation');

            expect(receivedActions).toHaveLength(1);
            expect(receivedActions[0]).toEqual({
                type: 'DELETE',
                relationId: 'id-1',
                relationName: 'my_relation',
            });
        });

        it('should dispatch RENAME action', () => {
            RelationEvents.rename('id-1', 'old_name', 'new_name', 'SELECT 1');

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
            RelationEvents.updateSql('id-1', 'my_relation', 'SELECT 2');

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
