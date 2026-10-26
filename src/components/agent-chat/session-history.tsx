'use client';

import {useState} from "react";
import type {SessionInfo} from "@agentclientprotocol/sdk";
import {History, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {useAgentChatState} from "@/state/agent/agent-chat.state";

/** Lists the agent's stored sessions (for Claude Code: the CLI transcripts) and loads one into the panel. */
export function SessionHistoryButton({disabled}: { disabled: boolean }) {
    const {listSessions, loadSession, agentId} = useAgentChatState();
    const [open, setOpen] = useState(false);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [sizes, setSizes] = useState<Record<string, number>>({});
    const [cursor, setCursor] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const fetchPage = async (next?: string) => {
        setLoading(true);
        setError(undefined);
        try {
            const page = await listSessions(next);
            setSessions((s) => next ? [...s, ...page.sessions] : page.sessions);
            const pageSizes = agentId ? await window.dashNative?.agent.sessionSizes(agentId, page.sessions.map(({sessionId, cwd}) => ({sessionId, cwd}))) : undefined;
            setSizes((s) => ({...(next ? s : {}), ...pageSizes}));
            setCursor(page.nextCursor ?? undefined);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    const onOpenChange = (value: boolean) => {
        setOpen(value);
        if (value) fetchPage();
    };

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Session history" disabled={disabled}>
                    <History className="size-4"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-1">
                <div className="max-h-96 overflow-y-auto">
                    {sessions.map((s) => (
                        <button
                            key={s.sessionId}
                            type="button"
                            className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                            onClick={() => {
                                setOpen(false);
                                loadSession(s);
                            }}
                        >
                            <span className="w-full truncate text-sm">{s.title || 'Untitled session'}</span>
                            <span className="flex w-full gap-2 text-xs text-muted-foreground">
                                {s.updatedAt && <span>{timeAgo(s.updatedAt)}</span>}
                                {sizes[s.sessionId] !== undefined && <span className="ml-auto">{formatSize(sizes[s.sessionId])}</span>}
                            </span>
                        </button>
                    ))}
                    {!loading && sessions.length === 0 && !error && (
                        <div className="px-2 py-3 text-sm text-muted-foreground">No sessions found.</div>
                    )}
                    {error && <div className="px-2 py-3 text-sm text-destructive">{error}</div>}
                    {loading && <Loader2 className="mx-auto my-2 size-4 animate-spin text-muted-foreground"/>}
                    {!loading && cursor && (
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => fetchPage(cursor)}>More</Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

const relativeTime = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'});
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3600], ['minute', 60]];

/** "3 hours ago", "yesterday", or "just now" within a minute. */
function timeAgo(iso: string): string {
    const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
    const [unit, size] = UNITS.find(([, size]) => seconds >= size) ?? [];
    return unit ? relativeTime.format(-Math.floor(seconds / size!), unit) : 'just now';
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
