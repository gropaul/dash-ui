import z from "zod";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {InMemoryTransport} from "@modelcontextprotocol/sdk/inMemory.js";
import type {JSONRPCMessage} from "@modelcontextprotocol/sdk/types.js";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useProjectsState} from "@/state/projects.state";
import {deleteFile, editFile, listFiles, moveFile, readFile, writeFile} from "@/state/agent/workspace-tools";
import {ViewManager} from "@/model/relation-state/relation-view";
import {expandPageRefs, missingRefs} from "@/state/relations/sql/page-refs";
import {cleanAndSplitSQL, removeSemicolon} from "@/platform/sql-utils";
import {qualifyRefCalls} from "@/platform/sql-refs";
import {normalizePath} from "@/state/workspace/paths";
import guide from "@/state/agent/dash-guide.md?raw";

/**
 * Dash's MCP server for agents: SQL on the app's database and the project's workspace files. It runs here, in
 * the app; a host only relays its messages (Electron's main process, electron/mcp.cjs).
 */

const MAX_ROWS = 1000;

const INSTRUCTIONS = `Dash is a data exploration app on DuckDB; these tools reach the project open in it: read-only SQL
(\`query\`) and the project's pages (.md) and queries (.sql), which are not on disk. Call \`guide\` before writing
or changing a page or query: it describes the file format, how blocks are named and read each other, and the layout.`;

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

/** `sql` as a block of `page` would run it: its refs to the page's blocks expanded into their queries. */
async function asBlockOf(page: string, sql: string): Promise<string[]> {
    const surface = `${normalizePath(page)}#`;
    const missing = missingRefs(surface, sql);
    if (missing.length > 0) throw new Error(`${missing.join(', ')} not found`);
    return cleanAndSplitSQL(qualifyRefCalls(await expandPageRefs(surface, sql, r => ViewManager.instance.buildMacroQuery(r))));
}

async function runQuery(sql: string, limit: number, page?: string) {
    const connection = ConnectionsService.getInstance();
    if (!connection.hasDatabaseConnection()) throw new Error('Dash has no database connection.');
    const statement = removeSemicolon(sql.trim());
    await checkReading(statement);
    // Expanded blocks may bring setup statements of their own (the blocks' SQL, as the page runs it).
    const statements = page ? await asBlockOf(page, statement) : [statement];
    for (const setup of statements.slice(0, -1)) await connection.executeQuery(setup, false);
    const result = await connection.executeQuery(`SELECT * FROM (${removeSemicolon(statements.at(-1)!)}) LIMIT ${limit + 1}`, true);
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

    server.registerTool('guide', {
        description: 'How Dash\'s pages and query files work: format, block names, refs between blocks, layout. Read it before writing or changing one.',
    }, () => respond(() => guide));

    server.registerTool('query', {
        description: 'Runs one read-only SQL statement (SELECT, DESCRIBE, SHOW, …) on Dash\'s DuckDB and returns its rows as JSON.',
        inputSchema: {
            sql: z.string(),
            page: z.string().optional().describe('A page\'s path: run the SQL as a block of it, so refs.<block>() reads its blocks.'),
            limit: z.number().int().min(1).max(MAX_ROWS).optional().describe(`Rows to return, 100 by default, at most ${MAX_ROWS}.`),
        },
    }, ({sql, page, limit}) => respond(() => runQuery(sql, limit ?? 100, page)));

    server.registerTool('list_files', {
        description: 'Lists the project\'s files and folders; folders end with /.',
    }, () => respond(listFiles));

    server.registerTool('read_file', {
        description: 'Returns the text of a file.',
        inputSchema: {path: z.string()},
    }, ({path}) => respond(() => readFile(path)));

    server.registerTool('edit_file', {
        description: 'Replaces old_text, which must occur exactly once in the file, with new_text. See `guide` for the format of pages and queries.',
        inputSchema: {path: z.string(), old_text: z.string(), new_text: z.string()},
    }, ({path, old_text, new_text}) => respond(() => editFile(path, old_text, new_text)));

    server.registerTool('write_file', {
        description: 'Creates a file, or replaces all of its text. See `guide` for the format of pages and queries.',
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
