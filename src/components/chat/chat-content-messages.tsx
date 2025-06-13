import React, {useRef, useEffect, useCallback} from "react";
import {Button} from "@/components/ui/button";
import {AlertCircle, Database, History, Plus, PopcornIcon, Send, Timer, X} from "lucide-react";
import {cn} from "@/lib/utils";
import {ChatMessageItem} from "./chat-message-item";

import {useChatState} from "@/state/chat.state";
import {ChatWindowProps} from "@/components/chat/chat-content-wrapper";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";


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

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = React.useState("");
    const atBottomRef = useRef(true); // ← tracks live “at-bottom” state

    /* ───────────── track user scroll position ───────────── */
    const handleScroll = useCallback(() => {
        const c = messagesContainerRef.current;
        if (!c) return;
        const threshold = 16; // px leeway
        atBottomRef.current =
            c.scrollHeight - c.scrollTop - c.clientHeight <= threshold;
    }, []);

    /* ───────────── textarea autosize ───────────── */
    useEffect(() => {
        const t = textareaRef.current;
        if (!t) return;
        t.style.height = "auto";
        t.style.height = `${Math.min(t.scrollHeight, 86)}px`;
    }, [inputValue]);

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

    const handleSendMessage = (content: string) => {
        // don't do anything if loading
        if (isLoading || !content.trim()) return;

        onSendMessage(content);
        setInputValue(""); // Clear input after sending
        // setTimeout(() => textareaRef.current?.focus(), 10);
    };

    return (
        <>
            {/* Error Alert */}
            {error && (
                <div className="w-full px-3">
                    <Alert variant="destructive">
                        <AlertTitle>
                            <div className="flex items-start justify-between w-full">
                                  <span>
                                    {error}, please check your provider settings.
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
                {messages.length ? (
                    <div className="space-y-4 flex flex-col w-full ">
                        {messages.map((m, index) => (
                            <ChatMessageItem showSystemMessage={showSystemMessage} key={index} message={m}/>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        How can I help you today?
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="px-2 pb-1 pt-2 border-t border-border/70">
                <div className="relative">
              <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message…"
                  className="w-full px-3 py-2 pr-8 text-sm bg-muted/50 rounded-[20px] focus:outline-none focus:ring-1 focus:ring-primary resize-none overflow-y-auto min-h-[38px] max-h-[86px] custom-scrollbar scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
                  rows={1}
                  onKeyDown={(e) => {
                      if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          inputValue.trim()
                      ) {
                          e.preventDefault();
                          handleSendMessage(inputValue);
                      }
                  }}
              />

                    <Button
                        size="icon"
                        className="absolute right-1 bottom-3 h-7 w-7 rounded-full"
                        disabled={!inputValue.trim() || isLoading}
                        onClick={() =>
                            inputValue.trim() && !isLoading && handleSendMessage(inputValue)
                        }
                    >
                        {isLoading ? (
                            <div
                                className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                        ) : (
                            <Send className="h-3 w-3"/>
                        )}
                    </Button>
                </div>
            </div>
        </>
    );
}
