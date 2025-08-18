import React, {useState} from "react";
import {ChatWrapper} from "./chat-wrapper";
import {aiService} from "@/components/chat/model/llm-service";
import {appendResponseMessages, Message} from "ai";
import {useChatState} from "@/state/chat.state";
import {
    FileUIPart,
    ReasoningUIPart,
    SourceUIPart,
    StepStartUIPart,
    TextUIPart,
    ToolInvocationUIPart
} from "@ai-sdk/ui-utils";
import {deepClone} from "@/platform/object-utils";
import {getErrorMessage} from "@/platform/error-handling";


interface ChatProps {
    className?: string;
}

interface ChatTabState {
    state: 'done' | 'inferring' | 'calling_tool';
    session_id?: string;
    error?: string;
}

function getInitialChatTabState(): ChatTabState {
    return {
        state: 'done',
        session_id: undefined,
        error: undefined,
    };
}

export function ChatTab({className}: ChatProps) {

    const setMessages = useChatState().setMessages;
    const addMessages = useChatState().addMessages;
    const updateLastMessage = useChatState().updateLastMessage;
    const [state, setState] = useState<ChatTabState>(getInitialChatTabState());

    const onHistoricSessionSelect = (sessionId?: string) => {
        setState({
            ...state,
            session_id: sessionId,
            state: 'done',
            error: undefined,
        });
    }

    const handleSendMessage = async (content: string) => {
        try {
            // Reset any previous errors
            setState({
                ...state,
                error: undefined,
            });

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

            const messageWithUserMessage = [...messages, userMessage];

            const sessionId = setMessages(messageWithUserMessage, state.session_id);
            state.session_id = sessionId;

            setState({
                ...state,
                session_id: sessionId,
                state: 'inferring',
            });

            type MessagePart =
                TextUIPart
                | ReasoningUIPart
                | ToolInvocationUIPart
                | SourceUIPart
                | FileUIPart
                | StepStartUIPart;

            const result = aiService.streamText(messageWithUserMessage);
            let currentMessage: Message;
            let currentMessageParts: MessagePart[] = [];
            let currentMessagePart: MessagePart | undefined = undefined;

            const messageWithUserMessageAndAnswers = [...messageWithUserMessage];

            function createNewEmptyMessage(id: string) {
                currentMessage = {
                    id: id,
                    role: 'assistant',
                    content: '',
                    parts: currentMessageParts,
                };
                if (!state.session_id) {
                    throw new Error('Session ID is not defined');
                }
                addMessages([currentMessage], state.session_id);
            }

            function finishCurrentMessage() {

                // if the currentMessage is not defined, throw an error
                if (!currentMessage) {
                    throw new Error('Step finish without step start');
                }

                // if the currentMessagePart is defined, add it to the currentMessageParts
                if (currentMessagePart) {
                    currentMessageParts.push(currentMessagePart);
                }

                // if state.session_id is not defined, throw an error
                if (!state.session_id) {
                    throw new Error('Session ID is not defined');
                }

                currentMessage.parts = currentMessageParts;

                updateLastMessage(currentMessage, state.session_id);
                currentMessageParts = [];
                currentMessagePart = undefined;
            }

            function updateGUIWithUnfinishedLastPart() {
                // if currentMessage is not defined, throw an error
                if (!currentMessage) {
                    throw new Error('Current message is not defined');
                }

                // current message part may not be undefined, but it is not finished yet
                if (currentMessagePart == undefined) {
                    throw new Error('Current message part is undefined');
                }

                // state.session_id must be defined at this point
                if (!state.session_id) {
                    throw new Error('Session ID is not defined');
                }

                // update clone parts with the unfinished part
                const currentMessageClone = deepClone(currentMessage);
                currentMessageClone.parts = [...currentMessageParts, currentMessagePart];

                updateLastMessage(currentMessageClone, state.session_id);
            }

            try {
                for await (const streamPart of result.fullStream) {

                    // Check for error in stream part
                    if (streamPart.type === 'error') {
                        throw new Error(getErrorMessage(streamPart.error).message || 'An error occurred in the stream');
                    }

                    switch (streamPart.type) {
                        case 'step-start':
                            createNewEmptyMessage(streamPart.messageId);
                            break;
                        // case 'tool-call':
                        //     const toolCallPart: ToolInvocationUIPart = {
                        //         type: 'tool-invocation',
                        //         toolInvocation: {
                        //             state: 'call',
                        //             ...streamPart,
                        //         }
                        //     }
                        //     currentMessageParts.push(toolCallPart);
                        //     break;
                        case 'tool-result':
                            let toolResultPart: ToolInvocationUIPart = {
                                type: 'tool-invocation',
                                toolInvocation: {
                                    state: 'result',
                                    ...streamPart,
                                }
                            };
                            currentMessageParts.push(toolResultPart);
                            break;
                        case 'step-finish':
                            finishCurrentMessage();
                            break;
                        case 'text-delta':
                            // if the currentMessagePart is undefined, create a new one
                            if (!currentMessagePart) {
                                currentMessagePart = {
                                    type: 'text',
                                    text: '',
                                };
                            } else if (currentMessagePart.type !== 'text') {
                                throw new Error('Text delta received but current message part is not text');
                            }
                            currentMessagePart.text += streamPart.textDelta;
                            updateGUIWithUnfinishedLastPart()
                            break
                    }
                }
            } catch (streamError) {
                console.error('Error in stream:', streamError);
                setState({
                    ...state,
                    state: 'done',
                    error: streamError instanceof Error ? streamError.message : 'An error occurred in the stream',
                });
                return;
            }

            setState({
                ...state,
                state: 'done',
            });

            try {
                // safety: if anything went wrong during streaming, this will overwrite it
                const response = await result.response;
                const newMessagesInferred = appendResponseMessages({
                    messages: messageWithUserMessageAndAnswers,
                    responseMessages: response.messages,
                });


                setMessages(newMessagesInferred, state.session_id);
            } catch (responseError) {
                console.error('Error getting final response:', responseError);
                setState({
                    ...state,
                    state: 'done',
                    error: responseError instanceof Error ? responseError.message : 'Failed to get response from the language model',
                });
            }
        } catch (error) {
            console.error('Error in handleSendMessage:', error);
            setState({
                ...state,
                state: 'done',
                error: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
        }
    };

    return (
        <div className={`h-full w-full`}>
            <ChatWrapper
                showSystemMessage={false}
                onSessionSelect={onHistoricSessionSelect}
                sessionId={state.session_id}
                onSendMessage={handleSendMessage}
                isLoading={state.state === 'inferring' || state.state === 'calling_tool'}
                error={state.error}
                onHideError={() => setState({...state, error: undefined})}
            />
        </div>
    );
}
