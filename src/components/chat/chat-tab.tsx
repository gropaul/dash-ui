import React, {useState} from "react";
import {ChatContentWrapper} from "./chat-content-wrapper";
import {aiService} from "@/components/chat/model/llm-service";
import {appendResponseMessages, Message} from "ai";
import {useChatState} from "@/state/chat.state";


interface ChatProps {
    className?: string;
}

interface ChatTabState {
    state: 'done' | 'inferring' | 'calling_tool';
    session_id?: string;
}

function getInitialChatTabState(): ChatTabState {
    return {
        state: 'done',
        session_id: undefined,
    };
}

export function ChatTab({className}: ChatProps) {

    const setMessages = useChatState().setMessages;
    const [state, setState] = useState<ChatTabState>(getInitialChatTabState());

    const onHistoricSessionSelect = (sessionId?: string) => {
        setState({
            ...state,
            session_id: sessionId,
            state: 'done',
        });

        console.log(`Selected session: ${sessionId}`);
    }

    const handleSendMessage = async (content: string) => {
        const messages = useChatState.getState().getMessages(state.session_id);

        const userMessage: Message = {
            id: crypto.randomUUID().toString(),
            role: 'user',
            content: '',
            parts: [{
                text: content,
                type: 'text',
            }],
        }

        const newMessages = [...messages, userMessage];

        const sessionId = setMessages(newMessages, state.session_id);
        state.session_id = sessionId;

        setState({
            ...state,
            session_id: sessionId,
            state: 'inferring',
        });

        const result = aiService.streamText(newMessages);
        for await (const part of result.fullStream) {
            console.log(part);
        }

        setState({
            ...state,
            state: 'done',
        });

        const response = await result.response;
        const newMessagesInferred = appendResponseMessages({
            messages: newMessages,
            responseMessages: response.messages,
        });

        setMessages(newMessagesInferred, state.session_id);
    };

    return (
        <div className={`h-full w-full`}>
            <ChatContentWrapper
                onSessionSelect={onHistoricSessionSelect}
                sessionId={state.session_id}
                onSendMessage={handleSendMessage}
                isLoading={state.state === 'inferring' || state.state === 'calling_tool'}
            />
        </div>
    );
}
