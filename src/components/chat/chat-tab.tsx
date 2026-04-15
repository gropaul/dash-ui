import React, {useRef, useState} from "react";
import {ChatWrapper} from "./chat-wrapper";
import {aiService} from "@/components/chat/model/llm-service";
import {UIMessage, UIMessagePart, DynamicToolUIPart} from "ai";
import {useChatState} from "@/state/chat.state";
import {deepClone} from "@/platform/object-utils";
import {buildTargetContextPrompt, getEnabledTargets} from "@/components/chat/model/chat-context";


class StreamError extends Error {
    constructor(error: unknown) {
        super(StreamError.extractMessage(error));
        this.name = 'StreamError';
    }

    private static extractMessage(error: unknown): string {
        if (error == null) return 'An error occurred in the stream';
        // Handle nested provider errors like {error: {message: "...", code: "..."}}
        if (typeof error === 'object') {
            const obj = error as Record<string, unknown>;
            if (typeof obj.message === 'string') return obj.message;
            if (typeof obj.error === 'object' && obj.error !== null) {
                const inner = obj.error as Record<string, unknown>;
                if (typeof inner.message === 'string') return inner.message;
            }
        }
        if (typeof error === 'string') return error;
        return 'An error occurred in the stream';
    }
}

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
    const abortControllerRef = useRef<AbortController | null>(null);

    const onHistoricSessionSelect = (sessionId?: string) => {
        setState({
            ...state,
            session_id: sessionId,
            state: 'done',
            error: undefined,
        });
    }

    const handleStop = () => {
        abortControllerRef.current?.abort();
    };

    const handleSendMessage = async (content: string) => {
        try {
            // Reset any previous errors
            setState({
                ...state,
                error: undefined,
            });

            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            const messages = useChatState.getState().getMessages(state.session_id);

            const userMessage: UIMessage = {
                id: crypto.randomUUID().toString(),
                role: 'user',
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

            // Inject dynamic context about available targets (not persisted)
            const targets = getEnabledTargets();
            const contextMessage: UIMessage = {
                id: 'dynamic-context',
                role: 'system',
                parts: [{type: 'text', text: buildTargetContextPrompt(targets)}],
            };
            const messagesWithContext = [messageWithUserMessage[0], contextMessage, ...messageWithUserMessage.slice(1)];

            const result = await aiService.streamText(messagesWithContext, abortController.signal);
            let currentMessage: UIMessage;
            let currentMessageParts: UIMessagePart<any, any>[] = [];
            let currentMessagePart: UIMessagePart<any, any> | undefined = undefined;

            function createNewEmptyMessage(id: string) {
                currentMessage = {
                    id: id,
                    role: 'assistant',
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

            let streamError: StreamError | undefined;

            try {
                for await (const streamPart of result.fullStream) {
                    if (streamPart.type === 'error') {
                        console.error('Error in stream part:', streamPart.error);
                        streamError = new StreamError(streamPart.error);
                        break;
                    }

                    switch (streamPart.type) {
                        case 'start-step':
                            createNewEmptyMessage(crypto.randomUUID().toString());
                            break;
                        case 'tool-result':
                            const toolResultPart: DynamicToolUIPart = {
                                type: 'dynamic-tool',
                                toolCallId: streamPart.toolCallId,
                                toolName: streamPart.toolName,
                                state: 'output-available',
                                input: streamPart.input,
                                output: streamPart.output,
                            };
                            currentMessageParts.push(toolResultPart);
                            break;
                        case 'finish-step':
                            finishCurrentMessage();
                            break;
                        case 'text-delta':
                            if (!currentMessagePart) {
                                currentMessagePart = {
                                    type: 'text',
                                    text: '',
                                };
                            }
                            (currentMessagePart as { type: 'text'; text: string }).text += streamPart.text;
                            updateGUIWithUnfinishedLastPart()
                            break
                    }
                }
            } catch (caught) {
                if (abortController.signal.aborted) {
                    // Flush any partial content that was streamed before abort
                    if (currentMessage! && currentMessagePart && state.session_id) {
                        currentMessageParts.push(currentMessagePart);
                        currentMessage!.parts = currentMessageParts;
                        updateLastMessage(currentMessage!, state.session_id);
                    }
                    setState({...state, state: 'done'});
                    return;
                }
                streamError = new StreamError(caught);
            }

            if (streamError) {
                setState({...state, state: 'done', error: streamError.message});
                return;
            }

            setState({
                ...state,
                state: 'done',
            });

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
                onStop={handleStop}
                isLoading={state.state === 'inferring' || state.state === 'calling_tool'}
                error={state.error}
                onHideError={() => setState({...state, error: undefined})}
            />
        </div>
    );
}
