'use client';

import {useState} from "react";
import type {SessionInfo} from "@agentclientprotocol/sdk";
import {History, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {useAgentChatState} from "@/state/agent/agent-chat.state";

/** Lists the agent's stored sessions (for Claude Code: the CLI transcripts) and loads one into the panel. */
export function SessionHistoryButton({disabled}: { disabled: boolean }) {
    const {listSessions, loadSession} = useAgentChatState();
    const [open, setOpen] = useState(false);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [cursor, setCursor] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const fetchPage = async (next?: string) => {
        setLoading(true);
        setError(undefined);
        try {
            const page = await listSessions(next);
            setSessions((s) => next ? [...s, ...page.sessions] : page.sessions);
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
                                <span className="truncate">{s.cwd}</span>
                                {s.updatedAt && <span className="ml-auto shrink-0">{formatDate(s.updatedAt)}</span>}
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

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {dateStyle: 'short', timeStyle: 'short'});
}
