'use client';

import type {PermissionOptionKind, RequestPermissionRequest} from "@agentclientprotocol/sdk";
import {ChevronDownIcon, ShieldCheck, ShieldQuestion, ShieldX} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {ToolCallBody} from "@/components/agent-chat/tool-call-view";
import type {PermissionAnswer} from "@/state/agent/session-items";

const optionVariant: Record<PermissionOptionKind, 'default' | 'secondary' | 'outline'> = {
    allow_once: 'default',
    allow_always: 'secondary',
    reject_once: 'outline',
    reject_always: 'outline',
};

interface PermissionCardProps {
    request: RequestPermissionRequest;
    answer?: PermissionAnswer;
    onAnswer: (answer: PermissionAnswer) => void;
}

export function PermissionCard({request, answer, onAnswer}: PermissionCardProps) {
    const {toolCall, options} = request;
    const title = toolCall.title ?? 'Permission requested';

    if (answer !== undefined) {
        const chosen = answer === 'cancelled' ? undefined : options.find((o) => o.optionId === answer.optionId);
        const allowed = chosen?.kind.startsWith('allow') ?? false;
        return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {allowed ? <ShieldCheck className="size-3.5 shrink-0"/> : <ShieldX className="size-3.5 shrink-0"/>}
                <span className="shrink-0">{chosen?.name ?? 'Cancelled'}:</span>
                <span className="truncate">{title}</span>
            </div>
        );
    }

    return (
        <Collapsible className="group rounded-2xl border px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
                <ShieldQuestion className="size-4 shrink-0 text-muted-foreground"/>
                <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                <CollapsibleTrigger className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
                    Details
                    <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180"/>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-2 max-h-60 space-y-2 overflow-auto">
                <ToolCallBody call={{
                    content: toolCall.content ?? undefined,
                    rawInput: toolCall.rawInput,
                    locations: toolCall.locations ?? undefined,
                }}/>
            </CollapsibleContent>
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                {options.map((option) => (
                    <Button
                        key={option.optionId}
                        size="sm"
                        variant={optionVariant[option.kind] ?? 'outline'}
                        className="h-7 px-2.5 text-xs"
                        onClick={() => onAnswer({optionId: option.optionId})}
                    >
                        {option.name}
                    </Button>
                ))}
            </div>
        </Collapsible>
    );
}
