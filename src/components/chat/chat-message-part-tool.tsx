import {BarChart3, DatabaseZap, FileText, Sheet} from "lucide-react";
import {
    TOOL_NAME_ADD_CHART_TO_DASHBOARD,
    TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD,
    TOOL_NAME_ADD_TABLE_TO_DASHBOARD,
    TOOL_NAME_EXECUTE_QUERY,
    ToolDisplayNameMap,
    ToolName
} from "@/components/chat/model/llm-service";
import {cn} from "@/lib/utils";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";
import React from "react";
import {ToolUIPart, DynamicToolUIPart, getToolName} from "ai";
import {parentRoleStyles, roleStyles, RoleType} from "@/components/chat/chat-message-part";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {JsonViewer} from "@/components/ui/json-viewer";
import {RelationPart} from "@/components/chat/chat-message-part-tool-relation";

export interface ToolIconProps {
    toolName: ToolName;
    className?: string; // Optional for styling flexibility
}

export function ToolIcon({ toolName, className }: ToolIconProps) {
    const iconSize = 14; // Default size for icons, can be adjusted
    switch (toolName) {
        case TOOL_NAME_ADD_CHART_TO_DASHBOARD:
            return <BarChart3 size={iconSize} className={className} />;
        case TOOL_NAME_ADD_TABLE_TO_DASHBOARD:
            return <Sheet size={iconSize} className={className} />;
        case TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD:
            return <FileText size={iconSize} className={className} />;
        case TOOL_NAME_EXECUTE_QUERY:
            return <DatabaseZap size={iconSize} className={className} />;
        default:
            return <></>; // Return empty if no icon is found
    }
}
interface ToolInvocationPartProps {
    part: ToolUIPart | DynamicToolUIPart;
    role: RoleType;
}


export function ToolInvocationPart({part, role}: ToolInvocationPartProps) {

    const toolName = getToolName(part) as ToolName;

    if (toolName === 'showTable' || toolName === 'showChart') {

        if (part.state === 'output-available' && part.output) {
            if (typeof part.output === 'string') {
                return <></>
            }
            return <RelationPart initialState={part.output as any} />;
        } else {
            return <div className={cn("p-2 bg-yellow-100 text-yellow-800 rounded-lg")}>
                Still executing query...
            </div>;
        }
    }

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
                            {part.input != null && (
                                <JsonViewer
                                    json={part.input as Record<string, any>}
                                    className="w-full"
                                />
                            )}
                            {part.state === "output-available" && (
                                <MarkdownRenderer markdown={String(part.output ?? "")}/>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}
