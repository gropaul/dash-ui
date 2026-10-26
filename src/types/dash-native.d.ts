import type {JSONRPCMessage} from "@modelcontextprotocol/sdk/types.js";

// Shape of the bridge exposed by electron/preload.cjs as `window.dashNative`.
// Present only in the Electron renderer; `undefined` in the browser (used to detect Electron).

export interface DashNativeApi {
    /** Runs an already-escaped query through the query_result_json macro; resolves to a JSON string. */
    query: (escapedQuery: string) => Promise<string>;
    /** Runs a raw query, bypassing the JSON macro; resolves to rows as array-of-arrays. */
    queryRaw: (query: string) => Promise<unknown[][]>;
    /** Interrupts the currently running query. */
    interrupt: () => Promise<boolean>;
    /** Storage root (home/.duckdb/extension_data/dash/) for per-project state DBs. */
    storageRoot: () => Promise<string>;
    agent: DashNativeAgentApi;
    /** Where agents reach Dash's MCP server (electron/mcp.cjs relays it); null until it listens. */
    mcpServer: () => Promise<{ url: string; token: string } | null>;
    /** Answers the MCP messages main relays: the response to a request, null for a notification. */
    serveMcp: (handle: (message: JSONRPCMessage) => Promise<JSONRPCMessage | null>) => () => void;
}

export interface AgentInfo {
    id: string;
    label: string;
}

/** Raw stdio pipe to an ACP agent process spawned by electron/agents.cjs. */
export interface DashNativeAgentApi {
    list: () => Promise<AgentInfo[]>;
    /** Spawns the agent; `cwd` is the directory it runs in. */
    start: (agentId: string) => Promise<{ channelId: number; cwd: string }>;
    /** The stored size in bytes of each session that has one (Claude Code's transcripts), by session id. */
    sessionSizes: (agentId: string, sessions: { sessionId: string; cwd: string }[]) => Promise<Record<string, number>>;
    write: (channelId: number, chunk: string) => void;
    close: (channelId: number) => void;
    onData: (channelId: number, callback: (chunk: string) => void) => () => void;
    /** Called with the exit code or signal once the process ends. */
    onExit: (channelId: number, callback: (code: number | string | null) => void) => () => void;
}

declare global {
    interface Window {
        dashNative?: DashNativeApi;
    }
}
