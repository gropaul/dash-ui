"use client";

// Adapted from AI Elements (elements.ai-sdk.dev): opens while the thought streams, closes once it ends.

import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";
import {cn} from "@/lib/utils";
import {BrainIcon, ChevronDownIcon} from "lucide-react";
import {useEffect, useState} from "react";

export interface ReasoningProps {
    text: string;
    isStreaming: boolean;
    className?: string;
}

export function Reasoning({text, isStreaming, className}: ReasoningProps) {
    const [open, setOpen] = useState(isStreaming);
    useEffect(() => setOpen(isStreaming), [isStreaming]);

    return (
        <Collapsible className={cn("not-prose", className)} open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
                <BrainIcon className="size-4"/>
                <span className={cn(isStreaming && "animate-pulse")}>{isStreaming ? "Thinking…" : "Thought"}</span>
                <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")}/>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">
                <MarkdownRenderer markdown={text}/>
            </CollapsibleContent>
        </Collapsible>
    );
}
