import React, {useState} from "react";
import {ChatWindow} from "./chat-window";
import {GetInitialState, ServiceState, aiService} from "@/components/chat/model/llm-service";
import {appendResponseMessages, Message} from "ai";


interface ChatProps {
    className?: string;
}

export function Chat({className}: ChatProps) {
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

        // set loading state
        setServiceState({
            ...serviceState,
            state: 'inferring',
            session: {
                ...serviceState.session,
                messages: [...serviceState.session.messages]
            }
        });

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
    };

    return (
        <div className={`h-full w-full`}>
            <ChatWindow
                state={serviceState}
                onSendMessage={handleSendMessage}
                isLoading={serviceState.state === 'inferring' || serviceState.state === 'calling_tool'}
            />
        </div>
    );
}
