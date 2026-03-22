import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getMacroName, extractParameters } from "@/state/relations/table-macros";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CodeFence } from "@/components/basics/code-fence/code-fence";

export interface MacroCopyButtonProps {
    relationName: string;
    sql: string;
    className?: string;
    size?: "default" | "sm" | "lg" | "icon";
    variant?: "default" | "ghost" | "outline";
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
export function getMacroUsageExample(relationName: string, sql: string): string {
    const macroName = getMacroName(relationName);
    const parameters = extractParameters(sql);

    if (parameters.length === 0) {
        return `${macroName}()`;
    } else {
        const paramPlaceholders = parameters.map(p => `${p} := '<${p}>'`).join(', ');
        return `${macroName}(${paramPlaceholders})`;
    }
}

/**
 * Generate Python example usage for the macro.
 */
export function getMacroPythonExample(relationName: string, sql: string): string {
    const macroName = getMacroName(relationName);
    const parameters = extractParameters(sql);

    if (parameters.length === 0) {
        return `duckdb.sql("FROM ${macroName}()")`;
    } else {
        const paramPlaceholders = parameters.map(p => `${p} := '<${p}>'`).join(', ');
        return `duckdb.sql(f"FROM ${macroName}(${paramPlaceholders})")`;
    }
}

/**
 * A button that shows macro info on hover and copies on click.
 * Can be used in both relation view header and workflow canvas header.
 */
export function MacroCopyButton({
    relationName,
    sql,
    className,
    size = "icon",
    variant = "ghost"
}: MacroCopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const usageExample = getMacroUsageExample(relationName, sql);
    const pythonExample = getMacroPythonExample(relationName, sql);
    const parameters = extractParameters(sql);

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
                    {parameters.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Parameters: </span>
                            {parameters.join(', ')}
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
