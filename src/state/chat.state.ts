import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
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
                    return [];
                }

                const session = get().sessions[sessionId];
                if (!session) {
                    throw new Error(`Session with id ${sessionId} not found`);
                }
                return session.messages;
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
