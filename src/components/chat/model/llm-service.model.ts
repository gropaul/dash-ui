import {DataEngAssistantPrompt} from "@/components/chat/model/promts";
import {Tool as OllamaTool} from "ollama";


export type ChatSessionType = 'sql-assistant'
export type LLMChatRole = 'user' | 'assistant' | 'system' | 'tool';
export type GUICallback = (state: ServiceState) => void;

export interface LLMToolCall {
    id: string; // Unique identifier for the tool call
    name: string;
    arguments: { [key: string]: any };
}

export interface LLMToolResult {
    call_id: string; // Unique identifier for the tool call
    name: string;
    message: string; // The result message from the tool
}

export function toolResultToString(toolResult: LLMToolResult): string {
    return `Tool: ${toolResult.name}, Call ID: ${toolResult.call_id}, Message: ${toolResult.message}`;
}

// Reduced OllamaMessage type for simplicity in storage and display
export interface BaseLLMChatMessage {
    role: 'user' | 'system'
    content: string;
}

export interface ToolLLMChatMessage {
    role: 'tool';
    toolResults: LLMToolResult[]; // Optional tool results
}

export interface AssistantLLMChatMessage {
    role: 'assistant';
    reasoning?: string; // Optional reasoning for the assistant's response
    content: string;
    toolCalls?: LLMToolCall[]; // Optional tool calls
}

export type LLMChatMessage = BaseLLMChatMessage | ToolLLMChatMessage | AssistantLLMChatMessage;

export function getMessageTextContent(message: LLMChatMessage): string {
    if (message.role === 'tool') {
        return message.toolResults.map(toolResultToString).join('\n');
    } else {
        return message.content;
    }
}

export interface ChatSession {
    initialPrompt?: LLMChatMessage; // Optional initial prompt for the session
    messages: LLMChatMessage[];
}


export interface ServiceState {
    state: 'done' | 'inferring' | 'calling_tool';
    toolName?: string;
    session: ChatSession;
}

export function GetNewChatSession(type: ChatSessionType = 'sql-assistant'): ChatSession {

    const initialPrompt: LLMChatMessage | undefined = type === 'sql-assistant' ? {
        role: 'system',
        content: DataEngAssistantPrompt,
    } : undefined;
    return {
        initialPrompt: initialPrompt,
        messages: []
    };
}


export function GetInitialState(): ServiceState {
    return {
        state: 'done',
        session: GetNewChatSession(),
    };
}


export interface LLMTool extends OllamaTool {
    call: (call: LLMToolCall) => Promise<LLMChatMessage>;
}