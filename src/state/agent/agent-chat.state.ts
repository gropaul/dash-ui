import {create} from 'zustand';
import {
    client,
    type ClientConnection,
    type CreateElicitationRequest,
    type CreateElicitationResponse,
    methods,
    PROTOCOL_VERSION,
    type RequestPermissionRequest,
    type RequestPermissionResponse,
    type ListSessionsResponse,
    type McpServer,
    type SessionInfo,
    type SessionMode,
    type SessionModeState,
} from '@agentclientprotocol/sdk';
import type {AgentInfo} from '@/types/dash-native';
import {applySessionUpdate, ChatItem, newItemId, PermissionAnswer} from '@/state/agent/session-items';
import {openAgentStream} from '@/state/agent/electron-transport';

/** Dash's own MCP server (state/agent/dash-mcp.ts): the project's data and files. */
async function dashMcpServers(): Promise<McpServer[]> {
    const server = await window.dashNative?.mcpServer();
    if (!server) return [];
    return [{type: 'http', name: 'dash', url: server.url, headers: [{name: 'Authorization', value: `Bearer ${server.token}`}]}];
}

export type AgentStatus = 'disconnected' | 'starting' | 'ready' | 'running' | 'exited';

export interface AgentChatZustand {
    agents: AgentInfo[];
    agentId: string | undefined;
    status: AgentStatus;
    items: ChatItem[];
    modes: SessionMode[];
    currentModeId: string | undefined;

    loadAgents: () => Promise<void>;
    startSession: (agentId: string) => Promise<void>;
    listSessions: (cursor?: string) => Promise<ListSessionsResponse>;
    loadSession: (info: SessionInfo) => Promise<void>;
    closeSession: () => Promise<void>;
    prompt: (text: string) => Promise<void>;
    cancel: () => Promise<void>;
    setMode: (modeId: string) => Promise<void>;
    answerPermission: (itemId: string, answer: PermissionAnswer) => void;
    answerElicitation: (itemId: string, response: CreateElicitationResponse) => void;
}

// Live connection objects stay out of the store: they are not state the UI renders.
interface LiveSession {
    connection: ClientConnection;
    sessionId: string;
    close: () => void;
    pending: Map<string, (answer: unknown) => void>;
}

let live: LiveSession | undefined;

export const useAgentChatState = create<AgentChatZustand>()((set, get) => {
    const addItem = (item: ChatItem) => set((s) => ({items: [...s.items, item]}));
    const notice = (text: string, error = false) => addItem({kind: 'notice', id: newItemId(), text, error});

    // Parks an agent request as a chat item until the user answers it.
    function ask<T>(item: ChatItem): Promise<T> {
        return new Promise<T>((resolve) => {
            live?.pending.set(item.id, resolve as (answer: unknown) => void);
            addItem(item);
        });
    }

    function settle(itemId: string, answer: unknown, patch: Partial<ChatItem>) {
        const resolve = live?.pending.get(itemId);
        if (!resolve) return;
        live!.pending.delete(itemId);
        set((s) => ({items: s.items.map((i) => i.id === itemId ? {...i, ...patch} as ChatItem : i)}));
        resolve(answer);
    }

    // ACP requires open permission prompts to resolve as cancelled when the turn is cancelled.
    function cancelPending() {
        for (const item of get().items) {
            if (item.kind === 'permission' && !item.answer) get().answerPermission(item.id, 'cancelled');
            if (item.kind === 'elicitation' && !item.answer) get().answerElicitation(item.id, {action: 'cancel'});
        }
    }

    // The process is gone, so open prompts can no longer be answered.
    function dropPending() {
        const open = live?.pending;
        if (!open) return;
        set((s) => ({
            items: s.items.map((i) => {
                if (!open.has(i.id)) return i;
                return i.kind === 'permission' ? {...i, answer: 'cancelled'} : {...i, answer: 'cancel'} as ChatItem;
            }),
        }));
        open.clear();
    }

    // Spawns a fresh agent process, initializes it, and lets `open` create or load the session.
    async function openSession(
        agentId: string,
        open: (connection: ClientConnection, cwd: string) => Promise<{ sessionId: string; modes?: SessionModeState | null }>,
    ) {
        await get().closeSession();
        set({agentId, status: 'starting', items: [], modes: [], currentModeId: undefined});
        try {
            const {stream, cwd, close} = await openAgentStream(agentId, (code) => {
                if (live?.close !== close) return;
                dropPending();
                live = undefined;
                set({status: 'exited'});
                notice(`Agent process exited (${code}).`, code !== 0);
            });
            const connection = client({name: 'dash'})
                .onNotification(methods.client.session.update, (ctx) => {
                    const update = ctx.params.update;
                    if (update.sessionUpdate === 'current_mode_update') {
                        set({currentModeId: update.currentModeId});
                    } else {
                        set((s) => ({items: applySessionUpdate(s.items, update)}));
                    }
                })
                .onRequest(methods.client.session.requestPermission, (ctx) => requestPermission(ctx.params))
                .onRequest(methods.client.elicitation.create, (ctx) => createElicitation(ctx.params))
                .connect(stream);
            live = {connection, sessionId: '', close, pending: new Map()};

            await connection.agent.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {
                    fs: {readTextFile: false, writeTextFile: false},
                    terminal: false,
                    elicitation: {form: {}},
                },
            });
            const session = await open(connection, cwd);
            live.sessionId = session.sessionId;
            set({
                status: 'ready',
                modes: session.modes?.availableModes ?? [],
                currentModeId: session.modes?.currentModeId,
            });
        } catch (e) {
            live?.close();
            live = undefined;
            set({status: 'disconnected'});
            notice(e instanceof Error ? e.message : String(e), true);
        }
    }

    async function requestPermission(request: RequestPermissionRequest): Promise<RequestPermissionResponse> {
        const answer = await ask<PermissionAnswer>({kind: 'permission', id: newItemId(), request});
        return {outcome: answer === 'cancelled' ? {outcome: 'cancelled'} : {outcome: 'selected', optionId: answer.optionId}};
    }

    async function createElicitation(request: CreateElicitationRequest): Promise<CreateElicitationResponse> {
        if (request.mode !== 'form') return {action: 'decline'};
        return ask<CreateElicitationResponse>({kind: 'elicitation', id: newItemId(), request});
    }

    return {
        agents: [],
        agentId: undefined,
        status: 'disconnected',
        items: [],
        modes: [],
        currentModeId: undefined,

        loadAgents: async () => {
            const agents = await window.dashNative?.agent.list() ?? [];
            set({agents, agentId: get().agentId ?? agents[0]?.id});
            if (!agents.length) {
                notice('No agent is installed. Dash runs the one on this computer: Claude Code, Codex (codex-acp), Gemini CLI, OpenCode or Goose.');
            }
        },

        startSession: (agentId) => openSession(agentId, async (connection, cwd) => {
            const session = await connection.agent.request(methods.agent.session.new, {cwd, mcpServers: await dashMcpServers()});
            return {sessionId: session.sessionId, modes: session.modes};
        }),

        listSessions: async (cursor) => {
            if (!live) return {sessions: []};
            return live.connection.agent.request(methods.agent.session.list, {cursor});
        },

        // Replays the stored history as ordinary session updates, then continues the conversation.
        loadSession: (info) => openSession(get().agentId!, async (connection) => {
            const session = await connection.agent.request(methods.agent.session.load, {
                sessionId: info.sessionId,
                cwd: info.cwd,
                mcpServers: await dashMcpServers(),
            });
            return {sessionId: info.sessionId, modes: session.modes};
        }),

        closeSession: async () => {
            if (!live) return;
            if (get().status === 'running') await get().cancel();
            dropPending();
            live.connection.close();
            live.close();
            live = undefined;
            set({status: 'disconnected'});
        },

        prompt: async (text) => {
            if (!live || get().status !== 'ready') return;
            addItem({kind: 'user', id: newItemId(), text});
            set({status: 'running'});
            const session = live;
            try {
                const response = await session.connection.agent.request(methods.agent.session.prompt, {
                    sessionId: session.sessionId,
                    prompt: [{type: 'text', text}],
                });
                if (response.stopReason !== 'end_turn' && response.stopReason !== 'cancelled') {
                    notice(`Stopped: ${response.stopReason}`, true);
                }
            } catch (e) {
                notice(e instanceof Error ? e.message : String(e), true);
            } finally {
                if (live === session) set({status: 'ready'});
            }
        },

        cancel: async () => {
            if (!live) return;
            cancelPending();
            await live.connection.agent.notify(methods.agent.session.cancel, {sessionId: live.sessionId});
        },

        setMode: async (modeId) => {
            if (!live) return;
            await live.connection.agent.request(methods.agent.session.setMode, {sessionId: live.sessionId, modeId});
            set({currentModeId: modeId});
        },

        answerPermission: (itemId, answer) => settle(itemId, answer, {answer}),
        answerElicitation: (itemId, response) => settle(itemId, response, {answer: response.action}),
    };
});
