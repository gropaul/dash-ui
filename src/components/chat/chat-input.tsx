import {Button} from "@/components/ui/button";
import {Send, Square} from "lucide-react";
import React from "react";
import {cn} from "@/lib/utils";
import {ChatContextBar} from "@/components/chat/chat-context-bar";


interface ChatInputProps {
    onSendMessage: (content: string) => void;
    onStop?: () => void;
    isLoading: boolean;
    className?: string;
}

export function ChatInput({onSendMessage, onStop, isLoading, className}: ChatInputProps) {
    const [inputValue, setInputValue] = React.useState("");

    const handleSendMessage = (content: string) => {
        // don't do anything if loading
        if (isLoading || !content.trim()) return;

        onSendMessage(content);
        setInputValue(""); // Clear input after sending
        // setTimeout(() => textareaRef.current?.focus(), 10);
    };


    return <div className={cn(className, 'px-2 pb-2 pt-2 border-t border-border/70')}>
        {/* Context Bar */}
        <ChatContextBar/>

        <div className="flex items-center bg-muted/50 rounded-[20px] focus-within:ring-1 focus-within:ring-primary">
              <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message…"
                  style={{overflowY: 'overlay' as any}}
                  className="flex-1 px-3 py-2 text-sm bg-transparent rounded-[20px] focus:outline-none resize-none min-h-[38px] max-h-[86px] custom-scrollbar scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
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

            {isLoading ? (
                <button
                    className="h-7 w-7 mr-1 shrink-0 rounded-full flex items-center justify-center animate-spin-border cursor-pointer bg-muted"
                    onClick={onStop}
                >
                    <Square className="h-2.5 w-2.5 fill-current"/>
                </button>
            ) : (
                <Button
                    size="icon"
                    className="h-7 w-7 mr-1 shrink-0 rounded-full"
                    disabled={!inputValue.trim()}
                    onClick={() =>
                        inputValue.trim() && handleSendMessage(inputValue)
                    }
                >
                    <Send className="h-3 w-3"/>
                </Button>
            )}
        </div>
    </div>
}