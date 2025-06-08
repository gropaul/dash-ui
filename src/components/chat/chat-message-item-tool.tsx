import { BarChart3, FileText, DatabaseZap } from "lucide-react";
import {
    TOOL_NAME_ADD_CHART_TO_DASHBOARD,
    TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD,
    TOOL_NAME_EXECUTE_QUERY,
    ToolName
} from "@/components/chat/model/llm-service";
import {cn} from "@/lib/utils";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";
import React from "react";
import {ToolInvocationUIPart} from "@ai-sdk/ui-utils";
import {parentRoleStyles, roleStyles, RoleType} from "@/components/chat/chat-message-item";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {JsonViewer} from "@/components/ui/json-viewer";

export interface ToolIconProps {
    toolName: ToolName;
    className?: string; // Optional for styling flexibility
}

export function ToolIcon({ toolName, className }: ToolIconProps) {
    const iconSize = 14; // Default size for icons, can be adjusted
    switch (toolName) {
        case "addChartToDashboard":
            return <BarChart3 size={iconSize} className={className} />;
        case "addMarkdownToDashboard":
            return <FileText size={iconSize} className={className} />;
        case "executeQuery":
            return <DatabaseZap size={iconSize} className={className} />;
        default:
            return null;
    }
}
interface ToolInvocationPartProps {
    part: ToolInvocationUIPart;
    role: RoleType;
}


// map that takes and tool name the tool display name
export const ToolDisplayNameMap: Record<string, string> = {
    [TOOL_NAME_EXECUTE_QUERY]: 'Execute Query',
    [TOOL_NAME_ADD_CHART_TO_DASHBOARD]: 'Add Chart to Dashboard',
    [TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD]: 'Add Markdown to Dashboard',
};


export function ToolInvocationPart({part, role}: ToolInvocationPartProps) {

    const toolName = part.toolInvocation.toolName as ToolName;

    return (
        <div className={cn("w-full", parentRoleStyles[role as keyof typeof parentRoleStyles])}>
            <div className={cn("rounded-lg ", roleStyles[role as keyof typeof roleStyles])}>
                <Accordion
                    type="single"
                    collapsible
                    className="w-full border border-primary rounded-lg"
                >
                    <AccordionItem value="item-1" className="border-none">
                        <AccordionTrigger className={'p-2 border-none'} >
                            <div className="flex items-center gap-2">
                                <ToolIcon toolName={toolName} />
                                {ToolDisplayNameMap[toolName] || toolName}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-2 flex flex-col gap-4 text-balance">
                            {part.toolInvocation.args && (
                                <JsonViewer
                                    json={part.toolInvocation.args}
                                    className="w-full"
                                />
                            )}
                            {part.toolInvocation.state === "result" && (
                                <MarkdownRenderer markdown={part.toolInvocation.result || ""}/>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}

