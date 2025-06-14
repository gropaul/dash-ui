import React from "react";
import {cn} from "@/lib/utils";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";
import {Message} from "ai";
import {ReasoningUIPart, TextUIPart} from "@ai-sdk/ui-utils";
import {ToolInvocationPart} from "@/components/chat/chat-message-item-tool";

interface ChatMessageItemProps {
    message: Message;
    showSystemMessage?: boolean;
}

export type RoleType = 'system' | 'user' | 'assistant' | 'data' | 'tool';

const commonParentStyle = "flex w-full";
export const parentRoleStyles = {
    user: `${commonParentStyle} justify-end`,
    assistant: `${commonParentStyle} justify-start`,
    system: `${commonParentStyle} justify-center`,
    tool: `${commonParentStyle} justify-center`,
};

const commonRoleStyle = "text-sm rounded-lg w-fit break-words";
export const roleStyles = {
    user: `${commonRoleStyle} bg-primary text-primary-foreground ml-auto text-right rounded-br-none max-w-[75%]`,
    assistant: `${commonRoleStyle} bg-muted text-muted-foreground mr-auto text-left rounded-bl-none max-w-[100%]`,
    system: `${commonRoleStyle} bg-gray-200 text-gray-800 italic mx-auto text-center max-w-[100%]`,
    tool: `${commonRoleStyle} w-full`,
};


export function ChatMessageItem({message, showSystemMessage}: ChatMessageItemProps) {
    const {role} = message;

    const isDev = process.env.NODE_ENV === "development";
    const isSystemMessage = role === "system";

    // only render system messages if showSystemMessage is true or in development mode
    if (isSystemMessage && !showSystemMessage) return null;
    if (!message.parts?.length) return null;

    return (
        <>
            {message.parts.map((part, index) => {
                switch (part.type) {
                    case "tool-invocation":
                        return <ToolInvocationPart key={index} part={part} role={'tool'}/>;
                    case "text":
                        return <TextPart key={index} part={part} role={role}/>;
                    case "reasoning":
                        return <ReasoningPart key={index} part={part} role={role}/>;
                    default:
                        return null; // or handle unsupported part types
                        return  <div key={index} className={cn("p-2 bg-red-100 text-red-800 rounded-lg")}>
                            Unsupported part type: {part.type}
                        </div>;
                }
            })}
        </>
    );
}

interface TextPartProps {
    part: TextUIPart;
    role: RoleType;
}

function TextPart({part, role}: TextPartProps) {
    return (
        <div className={cn("w-full", parentRoleStyles[role as keyof typeof parentRoleStyles])}>
            <div className={cn("p-2 rounded-lg", roleStyles[role as keyof typeof roleStyles])}>
                <MarkdownRenderer
                    markdown={part.text}
                    codeStyle={{
                        fontSize: "0.85em",
                        backgroundColor: "white",
                        borderRadius: "4px",
                    }}
                />
            </div>
        </div>
    );
}

interface ReasoningPartProps {
    part: ReasoningUIPart;
    role: RoleType;
}

function ReasoningPart({part, role}: ReasoningPartProps) {
    return (
        <div className={cn("w-full", parentRoleStyles[role as keyof typeof parentRoleStyles])}>
            <div className={cn("p-2 rounded-lg", roleStyles[role as keyof typeof roleStyles])}>
                <MarkdownRenderer
                    markdown={part.reasoning}
                    codeStyle={{
                        fontSize: "0.85em",
                        backgroundColor: "white",
                        borderRadius: "4px",
                    }}
                />
            </div>
        </div>
    );
}
