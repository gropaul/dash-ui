import React, { useState, useEffect } from "react";
import { ChatButton } from "./chat-button";
import { ChatWindow } from "./chat-window";
import { chatService, ChatMessage, ChatSession } from "./chat-service";

interface ChatProps {
  className?: string;
}

export function Chat({ className }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize or load existing session
  useEffect(() => {
    const initializeChat = async () => {
      // In a real implementation, you might load the last session from localStorage
      // or from a backend API
      const sessions = await chatService.getSessions();
      if (sessions.length > 0) {
        const latestSession = sessions.sort((a, b) => 
          b.updatedAt.getTime() - a.updatedAt.getTime()
        )[0];
        setCurrentSession(latestSession);
        setMessages(latestSession.messages);
      }
    };

    initializeChat();
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      const response = await chatService.sendMessage(content, {
        sessionId: currentSession?.id,
      });

      setCurrentSession(response.session);
      setMessages(response.session.messages);
      setInputValue("");
    } catch (error) {
      console.error("Failed to send message:", error);
      // Handle error (e.g., show a toast notification)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <ChatButton onClick={() => setIsOpen(true)} className={className} />
      )}

      <ChatWindow 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        inputValue={inputValue}
        setInputValue={setInputValue}
        isLoading={isLoading}
      />
    </>
  );
}
