// Electron only: its main process relays Dash's MCP server to agents (electron/mcp.cjs, src/state/agent/dash-mcp.ts).
import { test, expect } from './fixtures';
import { createEntity, createProject, openApp, readFile, treeItem, workspacePaths } from './utils';

interface McpServerInfo { url: string; token: string }

test.describe('Agent MCP server', () => {
  test('an agent queries the database and edits the workspace files', async ({ app: page, appOrigin, appApi }, testInfo) => {
    test.skip(testInfo.project.metadata.target !== 'electron', 'only the desktop app relays the MCP server');
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Agent');
    await createEntity(page, 'Query', 'Orders');

    const server = await page.evaluate(() => (window as unknown as { dashNative: { mcpServer: () => Promise<McpServerInfo> } }).dashNative.mcpServer());
    let id = 1;
    const rpc = async (method: string, params: Record<string, unknown> = {}, token = server.token) => fetch(server.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: id++, method, params }),
    });
    const callTool = async (name: string, args: Record<string, unknown> = {}) => {
      const { result } = await (await rpc('tools/call', { name, arguments: args })).json();
      return { text: result.content[0].text as string, isError: !!result.isError };
    };

    expect((await rpc('tools/list', {}, 'wrong')).status).toBe(401);
    const init = await (await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '0' } })).json();
    expect(init.result.instructions).toContain('Dash');

    expect(JSON.parse((await callTool('query', { sql: 'SELECT 42 AS answer' })).text).rows).toEqual([{ answer: 42 }]);
    expect(await callTool('query', { sql: 'CREATE TABLE t (x INT)' })).toEqual({ text: expect.stringContaining('Only reading statements'), isError: true });

    expect((await callTool('list_files')).text).toBe('orders.sql');
    await callTool('write_file', { path: 'Notes.md', text: '# Notes\n\nFirst line\n' });
    expect(await callTool('edit_file', { path: 'Notes.md', old_text: 'First line', new_text: 'Edited line' })).toEqual({ text: 'Done.', isError: false });
    await expect.poll(() => readFile(page, 'Notes.md')).toBe('# Notes\n\nEdited line\n');
    await expect(treeItem(page, 'Notes')).toBeVisible();
    expect(await workspacePaths(page)).toEqual(['Notes.md', 'orders.sql']);
  });
});
