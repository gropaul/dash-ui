import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getMacroName, extractParameters } from "@/state/relations/sql/table-macros";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CodeFence } from "@/components/basics/code-fence/code-fence";
import { ParameterDefinition } from "@/model/relation-view-state/parameters";

export interface MacroCopyButtonProps {
    relationName: string;
    sql: string;
    parameters?: ParameterDefinition[];
    className?: string;
    size?: "default" | "sm" | "lg" | "icon";
    variant?: "default" | "ghost" | "outline";
}

/**
 * Format a parameter value for SQL based on its type.
 * Strings are wrapped in single quotes, other types are not.
 */
function formatParamValue(param: ParameterDefinition): string {
    const value = param.defaultValue ?? `<${param.name}>`;

    if (param.type === 'string' || param.type === 'date') {
        return `'${value}'`;
    }

    return value;
}

/**
 * Generate the macro signature.
 */
export function getMacroSignature(relationName: string, sql: string): string {
    const macroName = getMacroName(relationName);
    const parameters = extractParameters(sql);

    if (parameters.length === 0) {
        return `${macroName}()`;
    } else {
        return `${macroName}(${parameters.join(', ')})`;
    }
}

/**
 * Generate example usage SQL for the macro.
 */
export function getMacroUsageExample(relationName: string, sql: string, paramDefs?: ParameterDefinition[]): string {
    const macroName = getMacroName(relationName);
    const paramNames = extractParameters(sql);

    if (paramNames.length === 0) {
        return `${macroName}()`;
    }

    // Create a map of parameter definitions for quick lookup
    const paramDefMap = new Map<string, ParameterDefinition>();
    for (const p of paramDefs ?? []) {
        paramDefMap.set(p.name, p);
    }

    const paramPlaceholders = paramNames.map(name => {
        const def = paramDefMap.get(name);
        if (def) {
            return `${name} := ${formatParamValue(def)}`;
        }
        return `${name} := '<${name}>'`;
    }).join(', ');

    return `${macroName}(${paramPlaceholders})`;
}

/**
 * Generate Python example usage for the macro.
 */
export function getMacroPythonExample(relationName: string, sql: string, paramDefs?: ParameterDefinition[]): string {
    const macroName = getMacroName(relationName);
    const paramNames = extractParameters(sql);

    if (paramNames.length === 0) {
        return `duckdb.sql("FROM ${macroName}()")`;
    }

    // Create a map of parameter definitions for quick lookup
    const paramDefMap = new Map<string, ParameterDefinition>();
    for (const p of paramDefs ?? []) {
        paramDefMap.set(p.name, p);
    }

    const paramPlaceholders = paramNames.map(name => {
        const def = paramDefMap.get(name);
        if (def) {
            return `${name} := ${formatParamValue(def)}`;
        }
        return `${name} := '<${name}>'`;
    }).join(', ');

    return `duckdb.sql(f"FROM ${macroName}(${paramPlaceholders})")`;
}

/**
 * A button that shows macro info on hover and copies on click.
 * Can be used in both relation view header and canvas canvas header.
 */
export function MacroCopyButton({
    relationName,
    sql,
    parameters: paramDefs,
    className,
    size = "icon",
    variant = "ghost"
}: MacroCopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const usageExample = getMacroUsageExample(relationName, sql, paramDefs);
    const pythonExample = getMacroPythonExample(relationName, sql, paramDefs);
    const paramNames = extractParameters(sql);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(usageExample);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Silent fail
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    className={className}
                    onClick={handleCopy}
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                    ) : (
                        <Copy className="h-4 w-4" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="end"
                sideOffset={0}
                className="w-auto"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium">Table Macro</h4>
                        <p className="text-xs text-muted-foreground">
                            Use this macro to reference this node.
                            {copied ? " Copied!" : " Click to copy."}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">SQL</p>
                        <CodeFence
                            displayCode={'FROM ' + usageExample}
                            showCopyButton={true}
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Python</p>
                        <CodeFence
                            displayCode={pythonExample}
                            showCopyButton={true}
                        />
                    </div>
                    {paramNames.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Parameters: </span>
                            {paramNames.join(', ')}
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
