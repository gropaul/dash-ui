/**
 * Chat Service API for LLM integration
 * This service provides an interface for sending messages to an LLM and receiving responses.
 */

export interface ChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
}

export interface ChatSession {
    id: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

export interface SendMessageOptions {
    sessionId?: string; // If not provided, a new session will be created
    systemPrompt?: string; // Optional system prompt to guide the assistant
}

export interface ChatServiceResponse {
    message: ChatMessage;
    session: ChatSession;
}

/**
 * Chat Service interface
 * This interface defines the methods that a chat service implementation must provide.
 */
export interface ChatService {
    /**
     * Send a message to the LLM and get a response
     * @param content The message content
     * @param options Options for the message
     * @returns A promise that resolves to the response
     */
    addUserMessage(content: string, options?: SendMessageOptions): ChatSession;

    /**
     * Infer a response from the assistant based on the last user message
     * @param options Options for the message
     * @returns A promise that resolves to the session with the assistant's response
     */
    inferAssistantMessage(options?: SendMessageOptions): Promise<ChatSession>;

    /**
     * Get a chat session by ID
     * @param sessionId The session ID
     * @returns A promise that resolves to the session or null if not found
     */
    getSession(sessionId: string): Promise<ChatSession | null>;

    /**
     * Get all chat sessions
     * @returns A promise that resolves to an array of sessions
     */
    getSessions(): Promise<ChatSession[]>;

    /**
     * Delete a chat session
     * @param sessionId The session ID
     * @returns A promise that resolves when the session is deleted
     */
    deleteSession(sessionId: string): Promise<void>;
}

/**
 * Mock implementation of the ChatService interface
 * This is a placeholder implementation that can be replaced with a real implementation later.
 */
export class MockChatService implements ChatService {
    private sessions: Map<string, ChatSession> = new Map();

    addUserMessage(content: string, options?: SendMessageOptions): ChatSession {
        const sessionId = options?.sessionId || crypto.randomUUID();
        let session = this.sessions.get(sessionId);

        if (!session) {
            session = {
                id: sessionId,
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.sessions.set(sessionId, session);
        }

        // Add user message
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            content,
            role: 'user',
            timestamp: new Date()
        };
        session.messages.push(userMessage);
        return session;
    }

    async inferAssistantMessage(options?: SendMessageOptions): Promise<ChatSession> {
        // wait for a response from the assistant (mocked here)
        const sessionId = options?.sessionId || crypto.randomUUID();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        let session = this.sessions.get(sessionId);

        // get the last message content
        if (!session) {
            throw new Error(`Session with ID ${sessionId} not found`);
        }
        const lastMessage = session.messages[session.messages.length - 1];

        // Mock assistant response
        const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            content: `This is a mock response to: "${lastMessage.content}"`,
            role: 'assistant',
            timestamp: new Date()
        };
        session.messages.push(assistantMessage);

        // Update session
        session.updatedAt = new Date();
        this.sessions.set(sessionId, session);

        return session;
    }

    async getSession(sessionId: string): Promise<ChatSession | null> {
        return this.sessions.get(sessionId) || null;
    }

    async getSessions(): Promise<ChatSession[]> {
        return Array.from(this.sessions.values());
    }

    async deleteSession(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId);
    }
}

// Export a singleton instance of the mock service
export const chatService = new MockChatService();