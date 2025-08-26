import {Button} from "@/components/ui/button";
import {Send} from "lucide-react";
import React from "react";
import {cn} from "@/lib/utils";


interface ChatInputProps {
    onSendMessage: (content: string) => void;
    isLoading: boolean;
    className?: string;
}

export function ChatInput({onSendMessage, isLoading, className}: ChatInputProps) {
    const [inputValue, setInputValue] = React.useState("");

    const handleSendMessage = (content: string) => {
        // don't do anything if loading
        if (isLoading || !content.trim()) return;

        onSendMessage(content);
        setInputValue(""); // Clear input after sending
        // setTimeout(() => textareaRef.current?.focus(), 10);
    };


    return <div className={cn(className, 'px-2 pb-1 pt-2 border-t border-border/70')}>
        <div className="relative">
              <textarea
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
}