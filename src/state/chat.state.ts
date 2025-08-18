import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {ChatSession, GetNewChatSession} from "@/components/chat/model/llm-service";
import {Message} from "ai";
import {deepClone} from "@/platform/object-utils";

export interface ChatZustand {
    sessions: Record<string, ChatSession>;
}

export interface ChatZustandActions {
    createSession: () => ChatSession;
    updateSession: (sessionId: string, session: ChatSession) => void;
    deleteSession: (sessionId: string) => void;
    getSession: (sessionId: string) => ChatSession | undefined;
    getMessages: (sessionId?: string) => Message[]; // If sessionId is not provided, return empty array
    setMessages: (messages: Message[], sessionId?: string) => string;
    addMessages: (messages: Message[], sessionId: string) => void; // If sessionId is not provided, create a new session
    // Replace the last message in the session with the new message
    updateLastMessage: (message: Message, sessionId: string) => void;
}

export const useChatState = create<ChatZustand & ChatZustandActions>()(
    persist(
        (set, get) => ({
            sessions: {},
            createSession: () => {
                const session = GetNewChatSession()
                set((state) => ({
                    sessions: {
                        ...state.sessions,
                        [session.id]: session, // Use session name as key
                    },
                }));
                return session;
            },
            updateSession: (sessionId, session) => {
                set((state) => ({
                    sessions: {
                        ...state.sessions,
                        [sessionId]: session,
                    },
                }));
            },
            getMessages: (sessionId) => {

                // If sessionId is not provided, return an empty array
                if (!sessionId) {
                    // return the messages of an empty session
                    const newSession = GetNewChatSession();
                    return newSession.messages;
                }

                const session = get().sessions[sessionId];
                if (!session) {
                    throw new Error(`Session with id ${sessionId} not found`);
                }
                return session.messages;
            },
            updateLastMessage: (message, sessionId) => {
                let session = get().sessions[sessionId];
                if (!session) {
                    throw new Error(`Session with id ${sessionId} not found`);
                }
                const newSession = deepClone(session); // Deep clone to avoid direct mutation
                // replace the last message of the session with the new message
                if (newSession.messages.length > 0) {
                    newSession.messages[newSession.messages.length - 1] = message;
                } else {
                    newSession.messages.push(message); // If no messages, just add the new message
                }
                set((state) => ({
                    sessions: {
                        ...state.sessions,
                        [newSession.id]: newSession, // Update the session in the store
                    },
                }));
            },
            setMessages: (messages, sessionId) => {
                // If sessionId is not provided, create a new session, else load existing session
                let session: ChatSession;
                if (!sessionId) {
                    session = GetNewChatSession();
                } else {
                    session = get().sessions[sessionId];
                }
                if (!session) {
                    throw new Error(`Session with id ${sessionId} not found`);
                }

                const newSession = deepClone(session); // Deep clone to avoid direct mutation
                newSession.messages = messages; // Update messages

                set((state) => ({
                    sessions: {
                        ...state.sessions,
                        [newSession.id]: newSession, // Update the session in the store
                    },
                }));

                return newSession.id; // Return the session ID

            },
            addMessages: (messages, sessionId) => {
                const session = get().sessions[sessionId];
                if (!session) {
                    throw new Error(`Session with id ${sessionId} not found`);
                }
                session.messages = [...session.messages, ...messages]; // Append new messages
                get().setMessages(session.messages, sessionId); // Update the session in the store
            },
            getSession: (sessionId) => get().sessions[sessionId],
            deleteSession: (sessionId) => {
                set((state) => {
                    const newSessions = {...state.sessions};
                    delete newSessions[sessionId];
                    return {
                        sessions: newSessions,
                    };
                });
            },
        }),
        {
            name: 'chat-sessions',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
