"use client";

// Adapted from AI Elements (elements.ai-sdk.dev): typed against ACP tool calls instead of AI SDK tool parts.

import {Badge} from "@/components/ui/badge";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {cn} from "@/lib/utils";
import type {ToolCallStatus, ToolKind} from "@agentclientprotocol/sdk";
import {
    ArrowRightLeft,
    CheckCircleIcon,
    ChevronDownIcon,
    CircleIcon,
    ClockIcon,
    FileText,
    Globe,
    Lightbulb,
    Pencil,
    Search,
    SquareTerminal,
    Trash2,
    Wrench,
    XCircleIcon,
} from "lucide-react";
import type {ComponentProps, ReactNode} from "react";

const kindIcons: Record<ToolKind, ReactNode> = {
    read: <FileText className="size-4"/>,
    edit: <Pencil className="size-4"/>,
    delete: <Trash2 className="size-4"/>,
    move: <ArrowRightLeft className="size-4"/>,
    search: <Search className="size-4"/>,
    execute: <SquareTerminal className="size-4"/>,
    think: <Lightbulb className="size-4"/>,
    fetch: <Globe className="size-4"/>,
    switch_mode: <ArrowRightLeft className="size-4"/>,
    other: <Wrench className="size-4"/>,
};

const statusLabels: Record<ToolCallStatus, string> = {
    pending: "Pending",
    in_progress: "Running",
    completed: "Completed",
    failed: "Failed",
};

const statusIcons: Record<ToolCallStatus, ReactNode> = {
    pending: <CircleIcon className="size-3"/>,
    in_progress: <ClockIcon className="size-3 animate-pulse"/>,
    completed: <CheckCircleIcon className="size-3"/>,
    failed: <XCircleIcon className="size-3 text-destructive"/>,
};

export const Tool = ({className, ...props}: ComponentProps<typeof Collapsible>) => (
    <Collapsible className={cn("group not-prose w-full rounded-md border", className)} {...props}/>
);

export type ToolHeaderProps = {
    title: string;
    kind?: ToolKind;
    status?: ToolCallStatus;
    className?: string;
};

export const ToolHeader = ({className, title, kind = 'other', status = 'pending'}: ToolHeaderProps) => (
    <CollapsibleTrigger className={cn("flex w-full items-center justify-between gap-2 px-3 py-2", className)}>
        <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground">{kindIcons[kind] ?? kindIcons.other}</span>
            <span className="truncate font-medium text-sm">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
            <Badge className="gap-1 rounded-full text-xs font-normal" variant="secondary">
                {statusIcons[status]}
                {statusLabels[status]}
            </Badge>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"/>
        </div>
    </CollapsibleTrigger>
);

export const ToolContent = ({className, ...props}: ComponentProps<typeof CollapsibleContent>) => (
    <CollapsibleContent className={cn("space-y-3 border-t p-3 text-sm outline-none", className)} {...props}/>
);

export const ToolSection = ({label, className, children}: { label: string; className?: string; children: ReactNode }) => (
    <div className={cn("space-y-1 overflow-hidden", className)}>
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</h4>
        {children}
    </div>
);
