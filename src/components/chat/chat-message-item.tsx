import React from "react";
import {cn} from "@/lib/utils";
import {MarkdownRenderer} from "@/components/basics/code-fence/md-renderer";
import {Message} from "ai";

interface ChatMessageItemProps {
    message: Message;
}

const roleStyles = {
    user: "bg-primary text-primary-foreground ml-auto text-right",
    assistant: "bg-muted text-muted-foreground mr-auto text-left",
    system: "bg-gray-200 text-gray-800 italic mx-auto text-center",
    tool: "bg-blue-100 text-blue-900 mx-auto text-sm",
};

export function ChatMessageItem({message}: ChatMessageItemProps) {
    const {role} = message;

    return (
        <div className="w-full my-2 flex">
            <div
                className={cn(
                    "p-3 rounded-lg text-sm break-words max-w-[80%]",
                    roleStyles[role as keyof typeof roleStyles] ?? roleStyles["assistant"]
                )}
            >
                {role === "system" ? (
                    <div className="mb-1 font-semibold uppercase text-xs">{role}</div>
                ) : null}

                {message.parts && message.parts.length > 0 && (
                    <>
                        {message.parts.map((part, index) => {
                            switch (part.type) {
                                case 'tool-invocation':
                                    return (
                                        <div key={index}>
                                            <div className="text-sm ">
                                                <div className={'font-semibold'}>Tool
                                                    Call: {part.toolInvocation.toolName}</div>
                                                <div
                                                    className="text-xs text-gray-500">Arguments: {JSON.stringify(part.toolInvocation.args)}</div>
                                            </div>
                                            {part.toolInvocation.state == 'result' && (
                                                <MarkdownRenderer key={index} markdown={part.toolInvocation.result || ''}/>
                                            )}
                                        </div>
                                    );
                                case 'text':
                                    return (
                                        <MarkdownRenderer
                                            key={index}
                                            markdown={part.text}
                                            codeStyle={{
                                                fontSize: '0.85em',
                                                backgroundColor: 'white',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    );
                                case 'reasoning':
                                    return (
                                        <div className="relative group text-xs text-gray-500 mb-1" key={index}>
                                            <span className="italic cursor-help">Thinking...</span>
                                            <div
                                                className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-100 text-gray-800 text-xs p-2 rounded shadow max-w-sm z-10">
                                                {part.reasoning}
                                            </div>
                                        </div>
                                    )
                                default:
                                    return null;
                            }
                        })}
                    </>
                )}
            </div>
        </div>
    );
}
