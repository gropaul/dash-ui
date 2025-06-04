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
        "p-3 rounded-lg text-sm break-words",
        message.role === "user" 
          ? "bg-primary text-primary-foreground ml-auto max-w-[80%] "
          : "bg-muted text-muted-foreground max-w-[100%]",
        className
      )}
    >
      {message.content}
    </div>
  );
}
