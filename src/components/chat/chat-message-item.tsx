import React from "react";
import { cn } from "@/lib/utils";
import { LLMChatMessage } from "@/components/chat/model/ollama-service";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";

interface ChatMessageItemProps {
    message: LLMChatMessage;
}

const roleStyles = {
    user: "bg-primary text-primary-foreground ml-auto text-right",
    assistant: "bg-muted text-muted-foreground mr-auto text-left",
    system: "bg-gray-200 text-gray-800 italic mx-auto text-center",
    tool: "bg-blue-100 text-blue-900 mx-auto text-sm",
};

export function ChatMessageItem({ message }: ChatMessageItemProps) {
    const { role, content } = message;

    // remove the <think> and </think> tags from the content
    const contentWithoutThinking = content.replace(/<think>.*?<\/think>/gs, "Thinking ... ").trim();

    return (
        <div className="w-full my-2 flex">
            <div
                className={cn(
                    "p-3 rounded-lg text-sm break-words max-w-[80%]",
                    roleStyles[role as keyof typeof roleStyles] ?? roleStyles["assistant"]
                )}
            >
                {role === "system" || role === "tool" ? (
                    <div className="mb-1 font-semibold uppercase text-xs">{role}</div>
                ) : null}
               <MarkdownRenderer
                   markdown={contentWithoutThinking}
                   codeStyle={{ fontSize: '0.85em' , backgroundColor: 'white', borderRadius: '4px' }}
               />
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-2">
                        <div className="text-xs text-gray-500">Tool Calls:</div>
                        <ul className="list-disc pl-5">
                            {message.toolCalls.map((call, index) => (
                                <li key={index} className="text-sm">
                                    <strong>{call.name}:</strong> {
                                    Object.entries(call.arguments).map(([key, value]) => (
                                        <span key={key} className="block">
                                            <span className="font-semibold">{key}:</span> {JSON.stringify(value)}
                                        </span>
                                    ))
                                }
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
