import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    onRelationEvent,
    RelationEvents,
    RelationEvent,
} from '../event/relation-events';
import { RelationState } from '@/model/relation-state';

function mockRelationState(overrides: Partial<RelationState> & { id: string }): RelationState {
    return {
        source: { type: 'sql', connectionId: 'conn-1' },
        query: { baseQuery: 'SELECT 1', activeBaseQuery: 'SELECT 1', viewParameters: {} },
        executionState: { state: 'idle' },
        viewState: {
            displayName: overrides.id,
            viewType: 'table',
            tableViewState: { queryParameters: { offset: 0, limit: 20, sorting: {}, filters: {} } },
        },
        ...overrides,
    } as RelationState;
}

describe('relation-events', () => {
    describe('onRelationEvent', () => {
        it('should subscribe and receive dispatched events', () => {
            const listener = vi.fn();
            const unsubscribe = onRelationEvent(listener);

            const state = mockRelationState({ id: 'test-id' });
            RelationEvents.create(state);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith({
                type: 'CREATE',
                new: state,
            });

            unsubscribe();
        });

        it('should unsubscribe correctly', () => {
            const listener = vi.fn();
            const unsubscribe = onRelationEvent(listener);

            unsubscribe();
            RelationEvents.delete(mockRelationState({ id: 'test-id' }));

            expect(listener).not.toHaveBeenCalled();
        });

        it('should support multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            const unsub1 = onRelationEvent(listener1);
            const unsub2 = onRelationEvent(listener2);

            RelationEvents.delete(mockRelationState({ id: 'test-id' }));

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

            RelationEvents.delete(mockRelationState({ id: 'test-id' }));

            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();

            unsub1();
            unsub2();
        });

        it('should filter by event types when specified', () => {
            const listener = vi.fn();
            const unsubscribe = onRelationEvent(listener, ['CREATE', 'DELETE']);

            const state = mockRelationState({ id: 'id-1' });
            const state2 = mockRelationState({ id: 'id-2' });

            RelationEvents.create(state);
            RelationEvents.updateSql(state, state2);
            RelationEvents.delete(state);

            expect(listener).toHaveBeenCalledTimes(2);
            expect(listener).toHaveBeenCalledWith({ type: 'CREATE', new: state });
            expect(listener).toHaveBeenCalledWith({ type: 'DELETE', old: state });

            unsubscribe();
        });
    });

    describe('RelationEvents helpers', () => {
        let receivedEvents: RelationEvent[];
        let unsubscribe: () => void;

        beforeEach(() => {
            receivedEvents = [];
            unsubscribe = onRelationEvent((event) => {
                receivedEvents.push(event);
            });
        });

        afterEach(() => {
            unsubscribe();
        });

        it('should dispatch CREATE event', () => {
            const state = mockRelationState({ id: 'id-1' });
            RelationEvents.create(state);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0]).toEqual({ type: 'CREATE', new: state });
        });

        it('should dispatch DELETE event', () => {
            const state = mockRelationState({ id: 'id-1' });
            RelationEvents.delete(state);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0]).toEqual({ type: 'DELETE', old: state });
        });

        it('should dispatch RENAME event', () => {
            const oldState = mockRelationState({ id: 'id-1' });
            const newState = mockRelationState({ id: 'id-1' });
            (newState.viewState as any).displayName = 'new_name';

            RelationEvents.rename(oldState, newState);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0]).toEqual({ type: 'RENAME', old: oldState, new: newState });
        });

        it('should dispatch UPDATE_SQL event', () => {
            const oldState = mockRelationState({ id: 'id-1' });
            const newState = mockRelationState({ id: 'id-1' });
            (newState.query as any).baseQuery = 'SELECT 2';

            RelationEvents.updateSql(oldState, newState);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0]).toEqual({ type: 'UPDATE_SQL', old: oldState, new: newState });
        });
    });
});
