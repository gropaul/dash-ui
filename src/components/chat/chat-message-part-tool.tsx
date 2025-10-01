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
import {ToolInvocationUIPart} from "@ai-sdk/ui-utils";
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
    part: ToolInvocationUIPart;
    role: RoleType;
}


export function ToolInvocationPart({part, role}: ToolInvocationPartProps) {

    const toolName = part.toolInvocation.toolName as ToolName;

    if (toolName === 'showTable' || toolName === 'showChart') {

        if (part.toolInvocation.state === 'result' && part.toolInvocation.result) {
            if (typeof part.toolInvocation.result === 'string') {
                return <></>
                // return <div className={cn("p-2 bg-red-100 text-red-800 rounded-lg")}>
                //     Error: {part.toolInvocation.result}
                // </div>;
            }
            return <RelationPart initialState={part.toolInvocation.result} />;
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

