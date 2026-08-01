"use client"

import React, {useState} from "react";
import {Check, Copy} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";
import {ParameterTypeSelector} from "@/components/relation/parameters/parameter-type-selector";
import {inferParameterType, ParameterDefinition, ParameterType} from "@/model/relation-view-state/parameters";

interface ParameterCardProps {
    parameter: ParameterDefinition;
    onUpdate: (updates: Partial<ParameterDefinition>) => void;
}

/**
 * One `{{param}}` in the settings panel. Stacked rather than tabular: the panel is tall and
 * narrow, so the fields sit under the name instead of beside it.
 */
export function ParameterCard({parameter, onUpdate}: ParameterCardProps) {
    const [copied, setCopied] = useState(false);

    async function handleCopyName() {
        try {
            await navigator.clipboard.writeText(`{{${parameter.name}}}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard is best-effort, the name is visible either way
        }
    }

    return (
        <div className="flex flex-col gap-2 rounded-md border bg-card px-2 py-2">
            <div className="flex items-center gap-1">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                    {`{{${parameter.name}}}`}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                    onClick={handleCopyName}
                    aria-label={`Copy {{${parameter.name}}}`}
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500"/> : <Copy className="h-3.5 w-3.5"/>}
                </Button>
            </div>

            <ParameterField label="Type">
                <ParameterTypeSelector
                    className="h-7 w-full text-xs"
                    value={parameter.type}
                    onChange={(type: ParameterType) => onUpdate({type})}
                />
            </ParameterField>

            <ParameterField label="Default">
                <Input
                    className="h-7 text-xs"
                    placeholder="none"
                    value={parameter.defaultValue ?? ''}
                    onChange={(e) => {
                        const value = e.target.value || undefined;
                        // typing a value re-infers the type, same as the old parameter strip did
                        const inferredType = value ? inferParameterType(value) : parameter.type;
                        onUpdate({defaultValue: value, type: inferredType});
                    }}
                />
            </ParameterField>

            <ParameterField label="Info">
                <Input
                    className="h-7 text-xs"
                    placeholder="Description"
                    value={parameter.description ?? ''}
                    onChange={(e) => onUpdate({description: e.target.value || undefined})}
                />
            </ParameterField>
        </div>
    );
}

/** Label on the left, control filling the rest - degrades to a stack when the panel gets narrow. */
function ParameterField({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Label className="w-12 shrink-0"><Muted>{label}</Muted></Label>
            <div className="min-w-24 flex-1">{children}</div>
        </div>
    );
}
