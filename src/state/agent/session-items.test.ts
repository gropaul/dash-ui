import {describe, expect, it} from 'vitest';
import type {SessionUpdate} from '@agentclientprotocol/sdk';
import {applySessionUpdate, ChatItem} from './session-items';

function apply(updates: SessionUpdate[], items: ChatItem[] = []): ChatItem[] {
    return updates.reduce(applySessionUpdate, items);
}

describe('applySessionUpdate', () => {
    it('appends message chunks of the same message and splits on a new message id', () => {
        const items = apply([
            {sessionUpdate: 'agent_message_chunk', messageId: 'a', content: {type: 'text', text: 'Hel'}},
            {sessionUpdate: 'agent_message_chunk', messageId: 'a', content: {type: 'text', text: 'lo'}},
            {sessionUpdate: 'agent_message_chunk', messageId: 'b', content: {type: 'text', text: 'Next'}},
        ]);
        expect(items.map((i) => i.kind === 'agent_text' && i.text)).toEqual(['Hello', 'Next']);
    });

    it('turns replayed user chunks into user items', () => {
        const items = apply([
            {sessionUpdate: 'user_message_chunk', messageId: 'u', content: {type: 'text', text: 'hi'}},
            {sessionUpdate: 'agent_message_chunk', messageId: 'a', content: {type: 'text', text: 'hello'}},
            {sessionUpdate: 'user_message_chunk', messageId: 'u2', content: {type: 'text', text: 'again'}},
        ]);
        expect(items.map((i) => i.kind)).toEqual(['user', 'agent_text', 'user']);
    });

    it('keeps thoughts and messages apart', () => {
        const items = apply([
            {sessionUpdate: 'agent_thought_chunk', content: {type: 'text', text: 'hmm'}},
            {sessionUpdate: 'agent_message_chunk', content: {type: 'text', text: 'hi'}},
        ]);
        expect(items.map((i) => i.kind)).toEqual(['thought', 'agent_text']);
    });

    it('merges tool call updates and keeps fields an update leaves out or nulls', () => {
        const items = apply([
            {sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Read file', kind: 'read', status: 'pending', rawInput: {path: '/a'}},
            {sessionUpdate: 'agent_message_chunk', content: {type: 'text', text: 'between'}},
            {sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'in_progress', rawInput: null},
            {sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed', rawOutput: 'done'},
        ]);
        expect(items).toHaveLength(2);
        const tool = items[0];
        expect(tool.kind === 'tool' && tool.call).toEqual({
            toolCallId: 't1', title: 'Read file', kind: 'read', status: 'completed', rawInput: {path: '/a'}, rawOutput: 'done',
        });
    });

    it('replaces the plan instead of appending a second one', () => {
        const items = apply([
            {sessionUpdate: 'plan', entries: [{content: 'a', priority: 'high', status: 'pending'}]},
            {sessionUpdate: 'plan', entries: [{content: 'a', priority: 'high', status: 'completed'}]},
        ]);
        expect(items).toHaveLength(1);
        expect(items[0].kind === 'plan' && items[0].entries[0].status).toBe('completed');
    });
});
