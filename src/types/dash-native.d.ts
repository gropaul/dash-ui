import type {JSONRPCMessage} from "@modelcontextprotocol/sdk/types.js";
import type {WorkspaceSnapshot} from "@/state/workspace/workspace-backend";

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
    workspace: DashNativeWorkspaceApi;
    /** Where agents reach Dash's MCP server (electron/mcp.cjs relays it); null until it listens. */
    mcpServer: () => Promise<{ url: string; token: string } | null>;
    /** Answers the MCP messages main relays: the response to a request, null for a notification. */
    serveMcp: (handle: (message: JSONRPCMessage) => Promise<JSONRPCMessage | null>) => () => void;
}

/** The open project's folder (electron/workspace-fs.cjs); paths are posix, relative to the folder. */
export interface DashNativeWorkspaceApi {
    /** Starts watching the folder and returns its `.md` and `.sql` files, its `dash.yaml` and its folders. */
    open: (folder: string) => Promise<WorkspaceSnapshot>;
    close: () => Promise<void>;
    write: (path: string, text: string) => Promise<void>;
    mkdir: (path: string) => Promise<void>;
    move: (from: string, to: string) => Promise<void>;
    remove: (path: string) => Promise<void>;
    /** The native folder picker; null when cancelled. */
    chooseFolder: () => Promise<string | null>;
    /** A folder's `dash.yaml` before its project is opened; null when there is none. */
    readConfig: (folder: string) => Promise<string | null>;
    /** Writes a folder's `dash.yaml`, creating the folder if missing. */
    writeConfig: (folder: string, text: string) => Promise<void>;
    /** Where new projects are created by default. */
    defaultParent: () => Promise<string>;
    /** Changes made outside Dash; `text` is null for a removed file. */
    onChanged: (callback: (path: string, text: string | null) => void) => () => void;
}

export interface AgentInfo {
    id: string;
    label: string;
    /** The CLI Dash looks for on the user's PATH. */
    command: string;
    /** Where that CLI was found; null when the agent isn't installed. */
    path: string | null;
    /** What to do to install it, in order. */
    setup: AgentSetupStep[];
}

export interface AgentSetupStep {
    text: string;
    /** A terminal command for the step. */
    command?: string;
}

/** Raw stdio pipe to an ACP agent process spawned by electron/agents.cjs. */
export interface DashNativeAgentApi {
    /** Every agent Dash supports, installed or not. */
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
