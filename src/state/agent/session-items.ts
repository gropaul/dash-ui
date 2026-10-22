import type {
    CreateElicitationRequest,
    CreateElicitationResponse,
    PlanEntry,
    RequestPermissionRequest,
    SessionUpdate,
    ToolCall,
} from "@agentclientprotocol/sdk";

export type ToolCallState = Omit<ToolCall, '_meta'>;

export type PermissionAnswer = { optionId: string } | 'cancelled';

export type ChatItem =
    | { kind: 'user'; id: string; messageId?: string; text: string }
    | { kind: 'agent_text'; id: string; messageId?: string; text: string }
    | { kind: 'thought'; id: string; messageId?: string; text: string }
    | { kind: 'plan'; id: string; entries: PlanEntry[] }
    | { kind: 'tool'; id: string; call: ToolCallState }
    | { kind: 'permission'; id: string; request: RequestPermissionRequest; answer?: PermissionAnswer }
    | { kind: 'elicitation'; id: string; request: CreateElicitationRequest; answer?: CreateElicitationResponse['action'] }
    | { kind: 'notice'; id: string; text: string; error?: boolean };

let nextItemId = 0;

export function newItemId(): string {
    return `item-${nextItemId++}`;
}

function appendChunk(items: ChatItem[], kind: 'user' | 'agent_text' | 'thought', text: string, messageId?: string): ChatItem[] {
    const last = items[items.length - 1];
    const sameMessage = last?.kind === kind && (messageId === undefined || last.messageId === undefined || last.messageId === messageId);
    if (sameMessage) {
        return [...items.slice(0, -1), {...last, text: last.text + text}];
    }
    return [...items, {kind, id: newItemId(), messageId, text}];
}

function setPlan(items: ChatItem[], entries: PlanEntry[]): ChatItem[] {
    const index = items.findLastIndex((item) => item.kind === 'plan');
    if (index === -1) return [...items, {kind: 'plan', id: newItemId(), entries}];
    return items.map((item, i) => i === index ? {...item, entries} as ChatItem : item);
}

// tool_call_update only carries changed fields; null or missing keeps the previous value.
function mergeToolCall(previous: ToolCallState, update: Partial<Record<keyof ToolCallState, unknown>>): ToolCallState {
    const merged: Record<string, unknown> = {...previous};
    for (const [key, value] of Object.entries(update)) {
        if (key === 'sessionUpdate' || key === '_meta' || value === null || value === undefined) continue;
        merged[key] = value;
    }
    return merged as ToolCallState;
}

/** Applies one `session/update` notification to the item list. Unknown update kinds are ignored. */
export function applySessionUpdate(items: ChatItem[], update: SessionUpdate): ChatItem[] {
    switch (update.sessionUpdate) {
        // Only sent while a stored session is replayed; live prompts are added by the client.
        case 'user_message_chunk':
            return update.content.type === 'text' ? appendChunk(items, 'user', update.content.text, update.messageId ?? undefined) : items;
        case 'agent_message_chunk':
            return update.content.type === 'text' ? appendChunk(items, 'agent_text', update.content.text, update.messageId ?? undefined) : items;
        case 'agent_thought_chunk':
            return update.content.type === 'text' ? appendChunk(items, 'thought', update.content.text, update.messageId ?? undefined) : items;
        case 'tool_call': {
            const {sessionUpdate: _, _meta: __, ...call} = update;
            const index = items.findIndex((item) => item.kind === 'tool' && item.call.toolCallId === call.toolCallId);
            if (index !== -1) return items.map((item, i) => i === index ? {...item, call: mergeToolCall((item as { call: ToolCallState }).call, call)} as ChatItem : item);
            return [...items, {kind: 'tool', id: newItemId(), call}];
        }
        case 'tool_call_update': {
            const index = items.findIndex((item) => item.kind === 'tool' && item.call.toolCallId === update.toolCallId);
            if (index === -1) {
                // An update for a call we never saw: create it so nothing gets lost.
                const call = mergeToolCall({toolCallId: update.toolCallId, title: update.title ?? 'Tool call'}, update);
                return [...items, {kind: 'tool', id: newItemId(), call}];
            }
            return items.map((item, i) => i === index ? {...item, call: mergeToolCall((item as { call: ToolCallState }).call, update)} as ChatItem : item);
        }
        case 'plan':
            return setPlan(items, update.entries);
        case 'plan_update':
            return update.plan.type === 'items' ? setPlan(items, update.plan.entries) : items;
        case 'plan_removed':
            return items.filter((item) => item.kind !== 'plan');
        default:
            return items;
    }
}
