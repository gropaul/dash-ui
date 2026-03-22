import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ParameterTypeSelector } from "./parameter-type-selector";
import { ParameterDefinition, ParameterType, inferParameterType } from "@/model/relation-view-state/parameters";
import { useState } from "react";

interface ParameterRowProps {
    parameter: ParameterDefinition;
    onUpdate: (updates: Partial<ParameterDefinition>) => void;
}

export function ParameterRow({ parameter, onUpdate }: ParameterRowProps) {
    const [copied, setCopied] = useState(false);

    async function handleCopyName() {
        try {
            await navigator.clipboard.writeText(`{{${parameter.name}}}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Silent fail
        }
    }

    return (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b last:border-b-0">
            {/* Copy button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCopyName}
                title={`Copy {{${parameter.name}}}`}
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                    <Copy className="h-3.5 w-3.5" />
                )}
            </Button>

            {/* Parameter name */}
            <div className="w-32 shrink-0 font-mono text-sm truncate">
                {parameter.name}
            </div>

            {/* Description input */}
            <Input
                className="h-7 text-xs flex-1 min-w-20"
                placeholder="Description"
                value={parameter.description ?? ''}
                onChange={(e) => onUpdate({ description: e.target.value || undefined })}
            />

            {/* Default value input */}
            <Input
                className="h-7 text-xs flex-1 min-w-20"
                placeholder="Default"
                value={parameter.defaultValue ?? ''}
                onChange={(e) => {
                    const value = e.target.value || undefined;
                    const inferredType = value ? inferParameterType(value) : parameter.type;
                    onUpdate({ defaultValue: value, type: inferredType });
                }}
            />

            {/* Type selector */}
            <ParameterTypeSelector
                value={parameter.type}
                onChange={(type: ParameterType) => onUpdate({ type })}
            />
        </div>
    );
}
