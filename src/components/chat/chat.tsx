import React, {useState, useEffect} from "react";
import {ChatButton} from "./chat-button";
import {ChatWindow} from "./chat-window";
import {
    GetNewChatSession,
    ServiceState,
    LLMChatMessage,
    ollamaService, GetInitialState
} from "@/components/chat/model/ollama-service";

interface ChatProps {
    className?: string;
}

export function Chat({className}: ChatProps) {
    const [isOpen, setIsOpen] = useState(false);

    const [serviceState, setServiceState] = useState<ServiceState>(GetInitialState())

    function guiCallback(state: ServiceState) {
        state.session.messages = [...state.session.messages]
        setServiceState(state);
    }

    const handleSendMessage = async (content: string) => {
        const message: LLMChatMessage = {
            role: 'user',
            content: content,
        }
        await ollamaService.sendMessages(serviceState.session, [message], guiCallback)
    };

    return (
        <>
            {!isOpen && (
                <ChatButton onClick={() => setIsOpen(true)} className={className}/>
            )}

            <ChatWindow
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                messages={serviceState.session.messages}
                onSendMessage={handleSendMessage}
                isLoading={serviceState.state === 'inferring' || serviceState.state === 'calling_tool'}
            />
        </>
    );
}
