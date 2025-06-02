import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatButtonProps {
  onClick: () => void;
  className?: string;
}

export function ChatButton({ onClick, className }: ChatButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "fixed h-12 w-12 bottom-8 right-8 rounded-full shadow-md hover:shadow-lg transition-all duration-200 z-50 p-2",
        className
      )}
      onClick={onClick}
    >
      <Avatar style={{ width: "46px", height: "46px" }}>
        <AvatarImage src="/favicon/web-app-manifest-192x192.png" alt="Chat" />
      </Avatar>
    </Button>
  );
}
