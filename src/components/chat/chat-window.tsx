import React, { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./chat-service";
import { ChatMessageItem } from "./chat-message-item";

interface ChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
    className?: string;
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    inputValue: string;
    setInputValue: (value: string) => void;
    isLoading?: boolean;
}

export function ChatWindow({
                               isOpen,
                               onClose,
                               className,
                               messages,
                               onSendMessage,
                               inputValue,
                               setInputValue,
                               isLoading = false,
                           }: ChatWindowProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    /* ───────────── send handler ───────────── */
    const handleSendMessage = (content: string) => {
        onSendMessage(content);
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    if (!isOpen) return null;

    return (
        <div
            className={cn(
                "fixed right-6 bottom-6 w-[30rem] max-h-[90vh] bg-background border rounded-lg shadow-lg z-50 flex flex-col",
                "animate-in slide-in-from-right duration-300",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between py-1 px-3 border-b">
                <div className="text-primary font-bold">Chat Assistant</div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-4 w-4">
                    <X />
                </Button>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar scroll-smooth"
            >
                {messages.length ? (
                    <div className="space-y-4">
                        {messages.map((m) => (
                            <ChatMessageItem key={m.id} message={m} />
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
              disabled={isLoading}
              rows={1}
              onKeyDown={(e) => {
                  if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      inputValue.trim() &&
                      !isLoading
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
