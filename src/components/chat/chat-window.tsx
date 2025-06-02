import React from "react";
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
  isLoading = false
}: ChatWindowProps) {

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed right-6 bottom-6 w-96 max-h-[90vh] bg-background border rounded-lg shadow-lg z-50 flex flex-col",
        "animate-in slide-in-from-right duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-1 px-3 border-b">
          <div className="text-primary text-nowrap flex flex-row space-x-1 items-center font-bold">
            Chat Assistant
            </div>
          <Button variant="ghost" size="icon" onClick={onClose} className={'h-4 w-4'}>
          <X/>
        </Button>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessageItem 
                key={message.id}
                message={message}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            How can I help you today?
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-3 py-2 pr-10 text-sm bg-muted/30 rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim() && !isLoading) {
                onSendMessage(inputValue);
              }
            }}
          />
          <Button 
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
            disabled={!inputValue.trim() || isLoading}
            onClick={() => {
              if (inputValue.trim() && !isLoading) {
                onSendMessage(inputValue);
              }
            }}
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
