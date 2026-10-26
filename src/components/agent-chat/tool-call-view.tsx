'use client';

import {diffLines} from "diff";
import type {Diff, ToolCallContent, ToolCallStatus} from "@agentclientprotocol/sdk";
import {Tool, ToolContent, ToolHeader, ToolSection} from "@/components/ai-elements/tool";
import {cn} from "@/lib/utils";
import type {ToolCallState} from "@/state/agent/session-items";

export function ToolCallView({call}: { call: ToolCallState }) {
    return (
        <Tool>
            <ToolHeader title={call.title} kind={call.kind} status={call.status}/>
            <ToolContent>
                <ToolCallBody call={call}/>
            </ToolContent>
        </Tool>
    );
}

/** Tool calls in a row, as one collapsed card; each call in it opens on its own. */
export function ToolCallGroup({calls}: { calls: ToolCallState[] }) {
    if (calls.length === 1) return <ToolCallView call={calls[0]}/>;
    return (
        <Tool>
            <ToolHeader title={`${calls.length} tool calls`} status={groupStatus(calls)}/>
            <ToolContent className="space-y-2">
                {calls.map(call => <ToolCallView key={call.toolCallId} call={call}/>)}
            </ToolContent>
        </Tool>
    );
}

/** Running while any call is, failed when any did, else completed. */
function groupStatus(calls: ToolCallState[]): ToolCallStatus {
    const statuses = calls.map(call => call.status ?? 'pending');
    if (statuses.some(s => s === 'pending' || s === 'in_progress')) return 'in_progress';
    return statuses.includes('failed') ? 'failed' : 'completed';
}

export function ToolCallBody({call}: { call: Pick<ToolCallState, 'content' | 'rawInput' | 'rawOutput' | 'locations'> }) {
    const content = call.content ?? [];
    return (
        <>
            {call.locations && call.locations.length > 0 && (
                <ToolSection label="Files">
                    {call.locations.map((l, i) => (
                        <div key={i} className="truncate font-mono text-xs">{l.path}{l.line != null ? `:${l.line}` : ''}</div>
                    ))}
                </ToolSection>
            )}
            {call.rawInput != null && (
                <ToolSection label="Input"><Pre text={formatJson(call.rawInput)}/></ToolSection>
            )}
            {content.map((c, i) => <ToolContentView key={i} content={c}/>)}
            {content.length === 0 && call.rawOutput != null && (
                <ToolSection label="Output"><Pre text={formatJson(call.rawOutput)}/></ToolSection>
            )}
        </>
    );
}

function ToolContentView({content}: { content: ToolCallContent }) {
    switch (content.type) {
        case 'diff':
            return <ToolSection label={content.path}><DiffView diff={content}/></ToolSection>;
        case 'terminal':
            return <ToolSection label="Terminal"><Pre text={`Terminal ${content.terminalId}`}/></ToolSection>;
        case 'content':
            if (content.content.type === 'text') return <ToolSection label="Output"><Pre text={content.content.text}/></ToolSection>;
            return <ToolSection label="Output"><Pre text={`[${content.content.type}]`}/></ToolSection>;
    }
}

export function DiffView({diff}: { diff: Diff }) {
    const parts = diffLines(diff.oldText ?? '', diff.newText);
    return (
        <pre className="max-h-96 overflow-auto rounded-md bg-muted/50 py-1 font-mono text-xs">
            {parts.map((part, i) => (
                <div
                    key={i}
                    className={cn(
                        "whitespace-pre-wrap px-2",
                        part.added && "bg-primary/10",
                        part.removed && "bg-destructive/10 text-destructive",
                        !part.added && !part.removed && "text-muted-foreground",
                    )}
                >
                    {prefixLines(part.value, part.added ? '+ ' : part.removed ? '- ' : '  ')}
                </div>
            ))}
        </pre>
    );
}

function prefixLines(text: string, prefix: string): string {
    return text.replace(/\n$/, '').split('\n').map((line) => prefix + line).join('\n');
}

function Pre({text}: { text: string }) {
    return <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2 font-mono text-xs">{text}</pre>;
}

function formatJson(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
