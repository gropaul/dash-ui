import z from "zod";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {InMemoryTransport} from "@modelcontextprotocol/sdk/inMemory.js";
import type {JSONRPCMessage} from "@modelcontextprotocol/sdk/types.js";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useProjectsState} from "@/state/projects.state";
import {deleteFile, editFile, listFiles, moveFile, readFile, writeFile} from "@/state/agent/workspace-tools";

/**
 * Dash's MCP server for agents: SQL on the app's database and the project's workspace files. It runs here, in
 * the app; a host only relays its messages (Electron's main process, electron/mcp.cjs).
 */

const MAX_ROWS = 1000;

const INSTRUCTIONS = `Dash is a data exploration app on DuckDB. These tools reach the project open in it.

Data: \`query\` runs one read-only SQL statement on Dash's DuckDB. The project's own tables are in the
\`dash\` catalog (schema \`main\`); the project's data sources are attached as further catalogs. Each query
file is a macro: \`FROM dash.refs.<file name>()\`. List what exists with
\`SELECT database_name, schema_name, table_name FROM duckdb_tables()\`.

Files: the project's pages (\`.md\`) and queries (\`.sql\`) are not on disk; read and change them only with
these file tools. Paths are relative to the project root. A query file is SQL under \`-- key: value\` header
lines; a page is markdown whose \`\`\`sql blocks are queries shown as tables, charts or inputs. Change files
with \`edit_file\` (exact text, read the file first) rather than rewriting them.`;

const quote = (sql: string) => `'${sql.replace(/'/g, "''")}'`;

/** Throws unless `sql` is a single statement that only reads: DuckDB serializes nothing but SELECT statements. */
async function checkReading(sql: string) {
    const result = await ConnectionsService.getInstance().executeQuery(`SELECT json_serialize_sql(${quote(sql)})::VARCHAR`, true);
    const parsed = JSON.parse(String(result.rows[0][0]));
    if (parsed.error) {
        throw new Error(parsed.error_type === 'not implemented' ? 'Only reading statements (SELECT, DESCRIBE, SHOW, …) are allowed.' : parsed.error_message);
    }
    if (parsed.statements.length !== 1) throw new Error(`Send exactly one statement (got ${parsed.statements.length}).`);
}

async function runQuery(sql: string, limit: number) {
    if (!ConnectionsService.getInstance().hasDatabaseConnection()) throw new Error('Dash has no database connection.');
    const statement = sql.trim().replace(/;+$/, '');
    await checkReading(statement);
    const result = await ConnectionsService.getInstance().executeQuery(`SELECT * FROM (${statement}) LIMIT ${limit + 1}`, true);
    const columns = result.columns.map(c => c.name);
    const rows = result.rows.slice(0, limit).map(row => Object.fromEntries(columns.map((name, i) => [name, row[i]])));
    return {columns, rows, truncated: result.rows.length > limit};
}

const asText = (value: unknown) => typeof value === 'string'
    ? value
    : JSON.stringify(value, (_key, v) => typeof v === 'bigint' ? v.toString() : v);

/** A tool's result; its errors go back to the agent as the result, so it can correct itself. */
async function respond(run: () => unknown) {
    try {
        if (!useProjectsState.getState().currentProjectId) throw new Error('No project is open in Dash.');
        return {content: [{type: 'text' as const, text: asText(await run() ?? 'Done.')}]};
    } catch (e) {
        return {content: [{type: 'text' as const, text: e instanceof Error ? e.message : String(e)}], isError: true};
    }
}

function createServer() {
    const server = new McpServer({name: 'dash', version: '1.0.0'}, {instructions: INSTRUCTIONS});

    server.registerTool('query', {
        description: 'Runs one read-only SQL statement (SELECT, DESCRIBE, SHOW, …) on Dash\'s DuckDB and returns its rows as JSON.',
        inputSchema: {
            sql: z.string(),
            limit: z.number().int().min(1).max(MAX_ROWS).optional().describe(`Rows to return, 100 by default, at most ${MAX_ROWS}.`),
        },
    }, ({sql, limit}) => respond(() => runQuery(sql, limit ?? 100)));

    server.registerTool('list_files', {
        description: 'Lists the project\'s files and folders; folders end with /.',
    }, () => respond(listFiles));

    server.registerTool('read_file', {
        description: 'Returns the text of a file.',
        inputSchema: {path: z.string()},
    }, ({path}) => respond(() => readFile(path)));

    server.registerTool('edit_file', {
        description: 'Replaces old_text, which must occur exactly once in the file, with new_text.',
        inputSchema: {path: z.string(), old_text: z.string(), new_text: z.string()},
    }, ({path, old_text, new_text}) => respond(() => editFile(path, old_text, new_text)));

    server.registerTool('write_file', {
        description: 'Creates a file, or replaces all of its text.',
        inputSchema: {path: z.string(), text: z.string()},
    }, ({path, text}) => respond(() => writeFile(path, text)));

    server.registerTool('move_file', {
        description: 'Moves or renames a file or folder; links, inputs and refs pointing at it follow.',
        inputSchema: {from: z.string(), to: z.string()},
    }, ({from, to}) => respond(() => moveFile(from, to)));

    server.registerTool('delete_file', {
        description: 'Deletes a file, or a folder with everything in it.',
        inputSchema: {path: z.string()},
    }, ({path}) => respond(() => deleteFile(path)));

    return server;
}

/**
 * Answers one JSON-RPC message from an agent: the response to a request, null for a notification. Each message
 * gets a server of its own, as in the SDK's stateless HTTP mode, so several agents can't mix up their ids.
 */
export async function handleMcpMessage(message: JSONRPCMessage): Promise<JSONRPCMessage | null> {
    const [client, serverSide] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    await server.connect(serverSide);
    try {
        if (!('id' in message) || !('method' in message)) {
            await client.send(message);
            return null;
        }
        const response = new Promise<JSONRPCMessage>(resolve => {
            client.onmessage = reply => {
                if ('id' in reply && reply.id === message.id && !('method' in reply)) resolve(reply);
            };
        });
        await client.start();
        await client.send(message);
        return await response;
    } finally {
        await server.close();
    }
}

/** Answers the MCP messages the Electron main process relays; returns the stop function. */
export function serveDashMcp(): () => void {
    return window.dashNative?.serveMcp(handleMcpMessage) ?? (() => undefined);
}
