import React from "react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./chat-service";

interface ChatMessageItemProps {
  message: ChatMessage;
  className?: string;
}

export function ChatMessageItem({ message, className }: ChatMessageItemProps) {
  return (
    <div 
      className={cn(
        "p-3 rounded-lg max-w-[80%] text-sm",
        message.role === "user" 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {message.content}
    </div>
  );
}