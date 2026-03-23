import {Copy, Check} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ParameterTypeSelector} from "./parameter-type-selector";
import {ParameterDefinition, ParameterType, inferParameterType} from "@/model/relation-view-state/parameters";
import {useState} from "react";
import {cn} from "@/lib/utils";

interface ParameterRowProps {
    parameter: ParameterDefinition;
    size: 'small' | 'large';
    onUpdate: (updates: Partial<ParameterDefinition>) => void;
}

export function ParameterRow({parameter, onUpdate, size}: ParameterRowProps) {
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
        <div className={cn("flex items-center  py-1.5 border-b last:border-b-0",
            size === 'small' ? "px-2 gap-2 " : "px-4 gap-3")}>
            {/* Copy button */}
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 shrink-0", size === 'small' ? "w-7" : "w-8")}
                onClick={handleCopyName}
                title={`Copy {{${parameter.name}}}`}
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500"/>
                ) : (
                    <Copy className="h-3.5 w-3.5"/>
                )}
            </Button>

            {/* Parameter name */}
            <div
                className={cn("w-32 shrink-0 font-mono text-sm truncate text-left", size === 'small' ? "pl-1 text-xs" : "text-sm")}>
                {parameter.name}
            </div>

            {size === 'large' && (
                <Input
                    className="h-7 text-xs flex-1 min-w-20"
                    placeholder="Description"
                    value={parameter.description ?? ''}
                    onChange={(e) => onUpdate({description: e.target.value || undefined})}
                />
            )}

            {/* Default value input */}
            <Input
                className="h-7 text-xs flex-1 min-w-20"
                placeholder="Default"
                value={parameter.defaultValue ?? ''}
                onChange={(e) => {
                    const value = e.target.value || undefined;
                    const inferredType = value ? inferParameterType(value) : parameter.type;
                    onUpdate({defaultValue: value, type: inferredType});
                }}
            />

            {/* Type selector */}
            <ParameterTypeSelector
                value={parameter.type}
                onChange={(type: ParameterType) => onUpdate({type})}
            />
        </div>
    );
}
