import React, {useState, useEffect} from "react";
import {ChatButton} from "./chat-button";
import {ChatWindow} from "./chat-window";
import {GetInitialState, LLMChatMessage, ServiceState} from "@/components/chat/model/llm-service.model";
import {ollamaService} from "@/components/chat/model/llm-service-ollama";
import {SendMessageArguments} from "@/components/chat/model/llm-service";
import {vercelaiService} from "@/components/chat/model/llm-service-vercelai";


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

        const args: SendMessageArguments = {
            session: serviceState.session,
            newMessages: [message],
            options: {
                callback: guiCallback
            }
        }

        await vercelaiService.sendMessages(args);
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
