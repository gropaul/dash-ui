import {beforeEach, describe, expect, it} from "vitest";
import type {JSONRPCMessage} from "@modelcontextprotocol/sdk/types.js";
import {handleMcpMessage} from "@/state/agent/dash-mcp";
import {applyEdit} from "@/state/agent/workspace-tools";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {useProjectsState} from "@/state/projects.state";

describe('applyEdit', () => {
    it('replaces text that occurs once, taking the new text literally', () => {
        expect(applyEdit('select 1 from a', 'from a', 'from b where x = \'$&\'')).toBe('select 1 from b where x = \'$&\'');
    });

    it('refuses text that is missing or occurs more than once', () => {
        expect(() => applyEdit('a b', 'c', 'd')).toThrow('not in the file');
        expect(() => applyEdit('a a', 'a', 'b')).toThrow('occurs 2 times');
        expect(() => applyEdit('a', '', 'b')).toThrow('empty');
    });
});

describe('Dash MCP server', () => {
    let nextId = 1;
    // The result of a request that succeeded.
    const resultOf = <T>(answer: JSONRPCMessage | null) => (answer as { result: T }).result;
    const call = async (name: string, args: Record<string, unknown> = {}) => {
        const answer = await handleMcpMessage({jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: {name, arguments: args}});
        const result = resultOf<{ content: { text: string }[], isError?: boolean }>(answer);
        return {text: result.content[0].text, isError: !!result.isError};
    };

    beforeEach(async () => {
        const files = {'Sales/orders.sql': 'select 1 from a'};
        const noop = async () => undefined;
        await useWorkspace.getState().load({load: async () => ({files, dirs: []}), write: noop, mkdir: noop, move: noop, remove: noop});
        useProjectsState.setState({currentProjectId: 'p'});
    });

    it('answers initialize and lists its tools; a notification gets no answer', async () => {
        const init = resultOf<{ instructions?: string }>(await handleMcpMessage({
            jsonrpc: '2.0', id: 0, method: 'initialize',
            params: {protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {name: 'test', version: '0'}},
        }));
        expect(init.instructions).toContain('Dash');
        expect(await handleMcpMessage({jsonrpc: '2.0', method: 'notifications/initialized'} as JSONRPCMessage)).toBeNull();

        const list = resultOf<{ tools: { name: string }[] }>(await handleMcpMessage({jsonrpc: '2.0', id: 1, method: 'tools/list'}));
        expect(list.tools.map(t => t.name)).toEqual(['query', 'list_files', 'read_file', 'edit_file', 'write_file', 'move_file', 'delete_file']);
    });

    it('reads and edits the live files, and reports a stale edit as an error', async () => {
        expect((await call('list_files')).text).toBe('Sales/\nSales/orders.sql');
        expect(await call('edit_file', {path: 'Sales/orders.sql', old_text: 'from a', new_text: 'from b'})).toEqual({text: 'Done.', isError: false});
        expect(useWorkspace.getState().files['Sales/orders.sql']).toBe('select 1 from b');
        expect(await call('edit_file', {path: 'Sales/orders.sql', old_text: 'from a', new_text: 'from c'}))
            .toEqual({text: 'old_text is not in the file; read it again.', isError: true});
    });
});
