'use client';

import {useEffect, useState} from "react";
import type {SessionInfo} from "@agentclientprotocol/sdk";
import {ChevronLeft, Folder, Folders, History, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Toggle} from "@/components/ui/toggle";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {useAgentChatState} from "@/state/agent/agent-chat.state";

/**
 * Lists the agent's stored sessions (for Claude Code: the CLI transcripts) and loads one into the panel.
 * In folder mode it lists the sessions' working folders first, and a folder opens its sessions.
 */
export function SessionHistoryButton({disabled}: { disabled: boolean }) {
    const {listSessions, loadSession, agentId} = useAgentChatState();
    const [open, setOpen] = useState(false);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [sizes, setSizes] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [search, setSearch] = useState('');
    const [byFolder, setByFolder] = useState(true);
    const [openFolder, setOpenFolder] = useState<string | undefined>();

    // Every page, so the folder counts and the search cover all sessions.
    const fetchAll = async () => {
        setLoading(true);
        setError(undefined);
        try {
            const all: SessionInfo[] = [];
            let cursor: string | undefined;
            do {
                const page = await listSessions(cursor);
                all.push(...page.sessions);
                cursor = page.nextCursor ?? undefined;
            } while (cursor);
            setSessions(sortByRecent(all));
            const allSizes = agentId ? await window.dashNative?.agent.sessionSizes(agentId, all.map(({sessionId, cwd}) => ({sessionId, cwd}))) : undefined;
            setSizes(allSizes ?? {});
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    const onOpenChange = (value: boolean) => {
        setOpen(value);
        if (value) {
            setOpenFolder(undefined);
            fetchAll();
        }
    };

    const query = search.trim().toLowerCase();
    const matching = query ? sessions.filter((s) => (s.title ?? '').toLowerCase().includes(query)) : sessions;
    const showFolders = byFolder && openFolder === undefined;
    const shownSessions = byFolder ? matching.filter((s) => s.cwd === openFolder) : matching;
    const folders = groupByFolder(matching);
    const empty = showFolders ? folders.length === 0 : shownSessions.length === 0;

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Session history" disabled={disabled}>
                    <History className="size-4"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-1">
                <div className="flex items-center gap-1 p-1">
                    <Input className="h-8" placeholder="Search sessions" value={search} onChange={(e) => setSearch(e.target.value)}/>
                    <TooltipWrapper message="By folder">
                        <Toggle size="sm" pressed={byFolder} onPressedChange={setByFolder} aria-label="By folder">
                            <Folders/>
                        </Toggle>
                    </TooltipWrapper>
                </div>
                {byFolder && openFolder !== undefined && (
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-1 px-2" onClick={() => setOpenFolder(undefined)}>
                        <ChevronLeft/>
                        <span className="truncate">{folderName(openFolder)}</span>
                    </Button>
                )}
                <div className="max-h-96 overflow-y-auto">
                    {showFolders ? folders.map(([cwd, group]) => (
                        <button
                            key={cwd}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                            onClick={() => setOpenFolder(cwd)}
                        >
                            <Folder className="size-4 shrink-0 text-muted-foreground"/>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate text-sm">{folderName(cwd)}</span>
                                <span className="truncate text-xs text-muted-foreground">{cwd}</span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
                                <span>{group.length} {group.length === 1 ? 'chat' : 'chats'}</span>
                                {group[0].updatedAt && <span>{timeAgo(group[0].updatedAt)}</span>}
                            </span>
                        </button>
                    )) : shownSessions.map((s) => (
                        <SessionRow key={s.sessionId} session={s} size={sizes[s.sessionId]} onClick={() => {
                            setOpen(false);
                            loadSession(s);
                        }}/>
                    ))}
                    {!loading && empty && !error && (
                        <div className="px-2 py-3 text-sm text-muted-foreground">No sessions found.</div>
                    )}
                    {error && <div className="px-2 py-3 text-sm text-destructive">{error}</div>}
                    {loading && <Loader2 className="mx-auto my-2 size-4 animate-spin text-muted-foreground"/>}
                </div>
            </PopoverContent>
        </Popover>
    );
}

/** The latest sessions as a "continue chatting" list, for the empty chat. */
export function RecentSessions({count}: { count: number }) {
    const {listSessions, loadSession, status, agentId} = useAgentChatState();
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const ready = status === 'ready';

    useEffect(() => {
        if (!ready) return;
        listSessions().then((page) => setSessions(sortByRecent(page.sessions).slice(0, count)), () => setSessions([]));
    }, [ready, agentId, count, listSessions]);

    if (sessions.length === 0) return null;
    return (
        <div className="w-full">
            <div className="px-2 pt-4 pb-1 text-xs font-medium text-muted-foreground">Continue chatting</div>
            {sessions.map((s) => (
                <SessionRow key={s.sessionId} session={s} folder onClick={() => loadSession(s)}/>
            ))}
        </div>
    );
}

function SessionRow({session, size, folder, onClick}: { session: SessionInfo; size?: number; folder?: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            onClick={onClick}
        >
            <span className="w-full truncate text-sm">{session.title || 'Untitled session'}</span>
            <span className="flex w-full gap-2 text-xs text-muted-foreground">
                {session.updatedAt && <span>{timeAgo(session.updatedAt)}</span>}
                {folder && <span className="truncate">{folderName(session.cwd)}</span>}
                {size !== undefined && <span className="ml-auto">{formatSize(size)}</span>}
            </span>
        </button>
    );
}

function sortByRecent(sessions: SessionInfo[]): SessionInfo[] {
    return [...sessions].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

/** Sessions per working folder, in the order of the folders' latest session. */
function groupByFolder(sessions: SessionInfo[]): [string, SessionInfo[]][] {
    const groups = new Map<string, SessionInfo[]>();
    for (const s of sessions) groups.set(s.cwd, [...(groups.get(s.cwd) ?? []), s]);
    return [...groups];
}

function folderName(cwd: string): string {
    return cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? cwd;
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
