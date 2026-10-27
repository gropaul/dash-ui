'use client';

import {useCallback, useEffect, useState} from "react";
import type {PlanEntry} from "@agentclientprotocol/sdk";
import {CheckCircle2, ChevronDown, Circle, CircleDot, Loader2, Plus, Send, Settings, Square} from "lucide-react";
import {Button} from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {Conversation, ConversationContent, ConversationScrollButton} from "@/components/ai-elements/conversation";
import {Reasoning} from "@/components/ai-elements/reasoning";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";
import {ToolCallGroup} from "@/components/agent-chat/tool-call-view";
import {PermissionCard} from "@/components/agent-chat/permission-card";
import {ElicitationForm} from "@/components/agent-chat/elicitation-form";
import {ChatRelationBlock} from "@/components/agent-chat/chat-relation-block";
import {isChatBlock, leadingChatBlock} from "@/state/agent/chat-blocks";
import {RecentSessions, SessionHistoryButton} from "@/components/agent-chat/session-history";
import {useAgentChatState} from "@/state/agent/agent-chat.state";
import type {ChatItem} from "@/state/agent/session-items";
import {cn} from "@/lib/utils";
import {useGUIState} from "@/state/gui.state";

export function AgentChatPanel() {
    return (
        <div className="flex h-full flex-col bg-background">
            <AgentChatHeader/>
            <AgentChatBody/>
        </div>
    );
}

function AgentChatHeader() {
    const {agents, agentId, modes, currentModeId, status, startSession, setMode} = useAgentChatState();
    const openSettingsTab = useGUIState((s) => s.openSettingsTab);
    const connected = status === 'ready' || status === 'running';
    return (
        <div className="flex h-10 shrink-0 items-center gap-1 border-b px-2">
            <span className="truncate px-2 text-xs font-medium">{agents.find((a) => a.id === agentId)?.label ?? 'Agent'}</span>
            {modes.length > 0 && (
                <HeaderPicker
                    label={modes.find((m) => m.id === currentModeId)?.name ?? 'Mode'}
                    value={currentModeId}
                    options={modes}
                    onChange={setMode}
                    disabled={!connected}
                />
            )}
            <div className="flex-1"/>
            {agentId && (
                <TooltipWrapper message="New session">
                    <Button variant="ghost" size="icon" className="size-7" aria-label="New session" onClick={() => startSession(agentId)}>
                        <Plus className="size-4"/>
                    </Button>
                </TooltipWrapper>
            )}
            {agentId && <SessionHistoryButton disabled={!connected}/>}
            <TooltipWrapper message="Agent settings">
                <Button variant="ghost" size="icon" className="size-7" aria-label="Agent settings" onClick={() => openSettingsTab('agents')}>
                    <Settings className="size-4"/>
                </Button>
            </TooltipWrapper>
        </div>
    );
}

interface PickerOption {
    id: string;
    name: string;
    description?: string | null;
}

function HeaderPicker({label, value, options, onChange, disabled}: {
    label: string;
    value?: string;
    options: PickerOption[];
    onChange: (id: string) => void;
    disabled?: boolean;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                    {label}
                    <ChevronDown className="size-3.5 opacity-50"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                    {options.map((o) => (
                        <DropdownMenuRadioItem key={o.id} value={o.id} className="items-start">
                            <div className="min-w-0">
                                <div>{o.name}</div>
                                {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
                            </div>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function AgentChatBody() {
    const {items, status, agentId, loadAgents, startSession} = useAgentChatState();

    useEffect(() => {
        if (status !== 'disconnected' || items.length > 0) return;
        loadAgents().then(() => {
            const id = useAgentChatState.getState().agentId;
            if (id) startSession(id);
        });
        // Starts once when the panel first opens; later sessions are started from the header.
    }, []);

    return (
        <>
            {/* Remounted when a chat appears, so a loaded history opens at the bottom without scrolling there. */}
            <Conversation key={items.length === 0 ? 'empty' : 'chat'} initial="instant">
                <ConversationContent>
                    {items.length === 0 ? (
                        status === 'starting'
                            ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/> Starting agent…</div>
                            : <RecentSessions count={5}/>
                    ) : <ChatItems items={items} running={status === 'running'}/>}
                    {status === 'running' && <Loader2 className="size-4 animate-spin text-muted-foreground"/>}
                </ConversationContent>
                <ConversationScrollButton/>
            </Conversation>
            {status === 'exited' && agentId && (
                <div className="flex justify-center border-t p-2">
                    <Button size="sm" variant="outline" onClick={() => startSession(agentId)}>Restart agent</Button>
                </div>
            )}
            {items.length === 0 && <ExamplePrompts/>}
            <PromptInput/>
        </>
    );
}

const EXAMPLE_PROMPTS = [
    'What data do I have?',
    'Create a dashboard from my data',
    'Write a query that summarizes my largest table',
];

/** Starters for the empty chat; a click sends the prompt. */
function ExamplePrompts() {
    const {status, prompt} = useAgentChatState();
    return (
        <div className="flex shrink-0 flex-wrap gap-1.5 px-2 pb-2">
            {EXAMPLE_PROMPTS.map((text) => (
                <Button key={text} variant="outline" size="sm" className="h-7 rounded-full text-xs font-normal" disabled={status !== 'ready'} onClick={() => prompt(text)}>
                    {text}
                </Button>
            ))}
        </div>
    );
}

// A long history renders its latest items, and earlier ones a page at a time on request.
const ITEMS_PAGE = 50;

function ChatItems({items, running}: { items: ChatItem[]; running: boolean }) {
    const [limit, setLimit] = useState(ITEMS_PAGE);
    const all = groupToolCalls(items);
    const shown = all.slice(-limit);
    return (
        <>
            {all.length > shown.length && (
                <Button variant="ghost" size="sm" className="self-center text-muted-foreground" onClick={() => setLimit(limit + ITEMS_PAGE)}>
                    Show earlier messages
                </Button>
            )}
            {shown.map((item, i) => (
                <ChatItemView key={item.id} item={item} isLast={i === shown.length - 1} running={running}/>
            ))}
        </>
    );
}

type ToolItem = Extract<ChatItem, { kind: 'tool' }>;
type ShownItem = Exclude<ChatItem, ToolItem> | { kind: 'tools', id: string, calls: ToolItem['call'][] };

/** The items, with tool calls in a row merged into one. */
function groupToolCalls(items: ChatItem[]): ShownItem[] {
    const shown: ShownItem[] = [];
    for (const item of items) {
        const last = shown.at(-1);
        if (item.kind !== 'tool') shown.push(item);
        else if (last?.kind === 'tools') last.calls.push(item.call);
        else shown.push({kind: 'tools', id: item.id, calls: [item.call]});
    }
    return shown;
}

function ChatItemView({item, isLast, running}: { item: ShownItem; isLast: boolean; running: boolean }) {
    const {answerPermission, answerElicitation} = useAgentChatState();
    switch (item.kind) {
        case 'user':
            return <div className="ml-8 self-end whitespace-pre-wrap rounded-2xl rounded-br-none bg-primary px-3 py-2 text-sm text-primary-foreground">{item.text}</div>;
        case 'agent_text':
            return <AgentTextView id={item.id} text={item.text} streaming={isLast && running}/>;
        case 'thought':
            return <Reasoning text={item.text} isStreaming={isLast && running}/>;
        case 'plan':
            return <PlanView entries={item.entries}/>;
        case 'tools':
            return <ToolCallGroup calls={item.calls}/>;
        case 'permission':
            return <PermissionCard request={item.request} answer={item.answer} onAnswer={(a) => answerPermission(item.id, a)}/>;
        case 'elicitation':
            return <ElicitationForm request={item.request} answer={item.answer} onAnswer={(r) => answerElicitation(item.id, r)}/>;
        case 'notice':
            return <div className={cn("text-xs", item.error ? "text-destructive" : "text-muted-foreground")}>{item.text}</div>;
    }
}

/**
 * An agent's message; its data fences show as blocks once it is complete, as the SQL until then. A block it starts
 * with fills the top of the bubble edge to edge.
 */
function AgentTextView({id, text, streaming}: { id: string; text: string; streaming: boolean }) {
    const lead = streaming ? undefined : leadingChatBlock(text);
    const restStart = lead?.end ?? 0;
    const renderCode = useCallback(({language, text, offset}: { language?: string, text: string, offset: number }) =>
        !streaming && isChatBlock(language, text) ? <ChatRelationBlock surface={`chat/${id}#${restStart + offset}`} text={text}/> : undefined,
    [id, streaming, restStart]);
    const rest = text.slice(restStart);
    return (
        <div data-agent-message className={cn("dashboard-prose w-full rounded-2xl rounded-bl-none bg-muted text-sm", lead ? "overflow-hidden border" : "px-3 py-2")}>
            {lead && <ChatRelationBlock surface={`chat/${id}#${lead.start}`} text={lead.text} bleed/>}
            {rest.trim() && (
                <div className={cn(lead && "px-3 py-2")}>
                    <MarkdownRenderer markdown={rest} renderCode={renderCode}/>
                </div>
            )}
        </div>
    );
}

function PlanView({entries}: { entries: PlanEntry[] }) {
    return (
        <div className="space-y-1 rounded-md border p-3 text-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</div>
            {entries.map((entry, i) => (
                <div key={i} className="flex items-start gap-2">
                    {entry.status === 'completed' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>
                        : entry.status === 'in_progress' ? <CircleDot className="mt-0.5 size-4 shrink-0"/>
                            : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>}
                    <span className={cn(entry.status === 'completed' && "text-muted-foreground line-through")}>{entry.content}</span>
                </div>
            ))}
        </div>
    );
}

function PromptInput() {
    const {status, prompt, cancel} = useAgentChatState();
    const [text, setText] = useState('');
    const running = status === 'running';
    const canSend = status === 'ready' && text.trim().length > 0;

    const send = () => {
        if (!canSend) return;
        prompt(text.trim());
        setText('');
    };

    return (
        <div className="shrink-0 border-t p-2">
            <div className="flex items-end gap-1 rounded-lg border bg-muted/30 p-1 focus-within:ring-1 focus-within:ring-ring">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    placeholder={status === 'ready' || running ? 'Ask the agent…' : 'Agent not connected'}
                    rows={2}
                    className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-1 text-sm focus:outline-none"
                />
                {running ? (
                    <TooltipWrapper message="Stop">
                        <Button size="icon" variant="secondary" className="size-8 shrink-0" aria-label="Stop" onClick={() => cancel()}>
                            <Square className="size-3 fill-current"/>
                        </Button>
                    </TooltipWrapper>
                ) : (
                    <Button size="icon" className="size-8 shrink-0" aria-label="Send" disabled={!canSend} onClick={send}>
                        <Send className="size-3"/>
                    </Button>
                )}
            </div>
        </div>
    );
}
