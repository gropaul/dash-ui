'use client';

import {diffLines} from "diff";
import type {Diff, ToolCallContent} from "@agentclientprotocol/sdk";
import {Tool, ToolContent, ToolHeader, ToolSection} from "@/components/ai-elements/tool";
import {cn} from "@/lib/utils";
import type {ToolCallState} from "@/state/agent/session-items";

export function ToolCallView({call}: { call: ToolCallState }) {
    const hasDiff = call.content?.some((c) => c.type === 'diff') ?? false;
    return (
        <Tool defaultOpen={hasDiff}>
            <ToolHeader title={call.title} kind={call.kind} status={call.status}/>
            <ToolContent>
                <ToolCallBody call={call}/>
            </ToolContent>
        </Tool>
    );
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
