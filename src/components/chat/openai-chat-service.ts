import { ChatService, ChatMessage, ChatSession, SendMessageOptions } from "./chat-service";
import OpenAI from "openai";

/**
 * OpenAI implementation of the ChatService interface
 * This service uses the OpenAI API to generate responses to user messages.
 */
export class OpenAIChatService implements ChatService {
    private sessions: Map<string, ChatSession> = new Map();
    private openai: OpenAI;
    
    constructor(apiKey?: string) {
        // log all environment variables for debugging
        for (const [key, value] of Object.entries(process.env)) {
            console.log(`${key}: ${value}`);
        }
        // Use the provided API key or fall back to the environment variable
        this.openai = new OpenAI({
            apiKey: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true
        });
    }
    
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
        session.updatedAt = new Date();
        
        return session;
    }
    
    async inferAssistantMessage(options?: SendMessageOptions): Promise<ChatSession> {
        const sessionId = options?.sessionId;
        
        if (!sessionId) {
            throw new Error("Session ID is required for inferring assistant message");
        }
        
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            throw new Error(`Session with ID ${sessionId} not found`);
        }
        
        try {
            // Convert our chat messages to OpenAI format
            const messages = session.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            // Add system prompt if provided
            if (options?.systemPrompt) {
                messages.unshift({
                    role: "assistant",
                    content: options.systemPrompt
                });
            }
            
            // Call OpenAI API
            const response = await this.openai.chat.completions.create({
                model: "gpt-4.1-2025-04-14", // Can be configurable in the future
                messages: messages,
            });
            
            // Extract the assistant's message
            const assistantResponse = response.choices[0]?.message?.content;
            
            if (!assistantResponse) {
                throw new Error("No response from OpenAI");
            }
            
            // Add assistant message to the session
            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                content: assistantResponse,
                role: 'assistant',
                timestamp: new Date()
            };
            
            session.messages.push(assistantMessage);
            session.updatedAt = new Date();
            
            return session;
        } catch (error) {
            console.error("Error calling OpenAI API:", error);
            throw new Error(`Failed to get response from OpenAI: ${error}`);
        }
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

// Export a singleton instance of the OpenAI service
export const openAIChatService = new OpenAIChatService();