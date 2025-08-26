import React, {useCallback, useEffect, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Send, X} from "lucide-react";
import {ChatMessageItem} from "./chat-message-item";

import {useChatState} from "@/state/chat.state";
import {ChatWindowProps} from "@/components/chat/chat-wrapper";
import {Alert, AlertTitle} from "@/components/ui/alert";
import {ChatInput} from "@/components/chat/chat-input";


export function ChatContentMessages({
                                        className,
                                        sessionId,
                                        onSendMessage,
                                        isLoading = false,
                                        showSystemMessage = true,
                                        error,
                                        onHideError,
                                    }: ChatWindowProps) {

    const messages = useChatState((state) => state.getMessages(sessionId));

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const atBottomRef = useRef(true); // ← tracks live “at-bottom” state

    /* ───────────── track user scroll position ───────────── */
    const handleScroll = useCallback(() => {
        const c = messagesContainerRef.current;
        if (!c) return;
        const threshold = 16; // px leeway
        atBottomRef.current =
            c.scrollHeight - c.scrollTop - c.clientHeight <= threshold;
    }, []);

    /* ───────────── auto-scroll on new messages ───────────── */
    useEffect(() => {
        const c = messagesContainerRef.current;
        if (!c) return;
        if (atBottomRef.current) {
            // small rAF delay keeps it buttery smooth
            requestAnimationFrame(() =>
                c.scrollTo({top: c.scrollHeight, behavior: "smooth"})
            );
        }
    }, [messages]);

    return (
        <div className={`flex flex-col h-full w-full ${className}`}>
            {/* Error Alert */}
            {error && (
                <div className="flex-none w-full px-3">
                    <Alert variant="destructive">
                        <AlertTitle>
                            <div className="flex items-start justify-between w-full">
                                  <span>
                                    {error} Please check your provider settings.
                                  </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full"
                                    onClick={onHideError}
                                >
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        </AlertTitle>
                    </Alert>

                </div>
            )}

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar scroll-smooth"
            >
                <div className="space-y-4 flex flex-col w-full ">
                    <div className="text-sm text-center space-y-2">
                        <div className="text-muted-foreground">
                            How can I help you today?
                        </div>
                        <div className="text-amber-500 dark:text-amber-400 text-xs max-w-md mx-auto">
                            Warning: While using the assistant, your messages and data can be shared with the provider! The agent can read, write and *delete* your data.
                        </div>
                    </div>
                    {messages.map((m, index) => (
                        <ChatMessageItem showSystemMessage={showSystemMessage} key={index} message={m}/>
                    ))}
                </div>
            </div>

            {/* Input Area */}
            <ChatInput
                className={'flex-none'}
                onSendMessage={onSendMessage}
                isLoading={isLoading}
            />
        </div>
    );
}
