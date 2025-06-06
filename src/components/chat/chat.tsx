import React, {useState} from "react";
import {ChatButton} from "./chat-button";
import {ChatWindow} from "./chat-window";
import {GetInitialState, ServiceState, aiService} from "@/components/chat/model/llm-service";
import {appendResponseMessages, Message} from "ai";


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
        const messages: Message = {
            id: crypto.randomUUID().toString(),
            role: 'user',
            content: '',
            parts: [{
                text: content,
                type: 'text',
            }],
        }

        serviceState.session.messages.push(messages);

        const result = aiService.streamText(serviceState.session.messages);
        for await (const part of result.fullStream) {
            console.log(part);
        }
        const response = await result.response;
        const newMessages= appendResponseMessages({
            messages: serviceState.session.messages,
            responseMessages: response.messages,
        });
        setServiceState({
            ...serviceState, session: {
                ...serviceState.session,
                messages: newMessages
            }
        });

        console.log('NEw messages', newMessages);

    };

    return (
        <>
            {!isOpen && (
                <ChatButton onClick={() => setIsOpen(true)} className={className}/>
            )}

            <ChatWindow
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                state={serviceState}
                onSendMessage={handleSendMessage}
                isLoading={serviceState.state === 'inferring' || serviceState.state === 'calling_tool'}
            />
        </>
    );
}
