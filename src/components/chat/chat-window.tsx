import React, { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {Database, History, Plus, Send, Timer} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessageItem } from "./chat-message-item";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Message} from "ai";
import {useChatState} from "@/state/chat.state";


interface ChatWindowProps {
    className?: string;
    sessionId?: string;
    onSendMessage: (content: string) => void;
    isLoading?: boolean;
}

export function ChatWindow({
                               className,
                               sessionId,
                               onSendMessage,
                               isLoading = false,
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
                c.scrollTo({ top: c.scrollHeight, behavior: "smooth" })
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
        <div
            className={cn(
                "h-full w-full bg-background flex flex-col",
                className
            )}
        >
            <div className="pl-4 pt-2.5 pr-3 pb-2 flex flex-row items-center justify-between overflow-hidden">
                <div className="text-primary text-nowrap flex flex-row space-x-1 items-center font-bold">
                    Chat Assistant
                </div>
                    <Button variant={'ghost'} size={'icon'} className={'h-8 w-8'}>
                        <History size={16}/>
                    </Button>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar scroll-smooth"
            >
                {messages.length ? (
                    <div className="space-y-4 flex flex-col w-full ">
                        {messages.map((m, index) => (
                            <ChatMessageItem key={index} message={m} />
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        How can I help you today?
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t">
                <div className="relative">
          <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message…"
              className="w-full px-3 py-2 pr-8 text-sm bg-muted/30 rounded-[20px] focus:outline-none focus:ring-1 focus:ring-primary resize-none overflow-y-auto min-h-[38px] max-h-[86px] custom-scrollbar scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
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
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                            <Send className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
