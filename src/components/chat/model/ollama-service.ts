import {Ollama} from 'ollama/browser';
import {Message as OllamaMessage, Tool as OllamaTool} from "ollama";
import {AddTwoNumbersTool, MultiplyTwoNumbersTool, QueryDatabaseTool} from "@/components/chat/model/tools";

type LLMModel = 'qwen3:8b'
type LLMChatRole = 'user' | 'assistant' | 'system' | 'tool';

// Reduced OllamaMessage type for simplicity in storage and display
export interface LLMChatMessage {
    role: LLMChatRole;
    content: string;
    toolCalls?: string[];
}

export interface ServiceState {
    state: 'done' | 'inferring' | 'calling_tool';
    toolName?: string;
    session: ChatSession;
}

export function GetInitialState(): ServiceState {
    return {
        state: 'done',
        session: GetNewChatSession(),
    };
}

export type GUICallback = (state: ServiceState) => void;

function ollamaMessageToChatMessage(message: OllamaMessage): LLMChatMessage {
    return {
        role: message.role as LLMChatRole,
        content: message.content,
        toolCalls: message.tool_calls ? message.tool_calls.map(tc => tc.function.name) : undefined,
    };
}

function chatMessageToOllamaMessage(message: LLMChatMessage): OllamaMessage {
    return {
        role: message.role,
        content: message.content,
    };
}

export interface ChatSession {
    messages: LLMChatMessage[];
}

export function GetNewChatSession(): ChatSession {
    return {
        messages: []
    };
}


export interface LLMTool extends OllamaTool {
    call: (args: { [key: string]: any }) => Promise<LLMChatMessage>;
}

class OllamaService {
    private ollama: Ollama;
    private readonly defaultModel: LLMModel;
    private readonly tools: LLMTool[];

    constructor(host: string, model: LLMModel, tools: LLMTool[] = []) {
        this.ollama = new Ollama({host});
        this.defaultModel = model;
        this.tools = tools;
    }

    async sendMessages(session: ChatSession, messages: LLMChatMessage[], callback?: GUICallback): Promise<void> {

        // call the Ollama API with the session messages
        session.messages.push(...messages);
        callback?.({
            state: 'inferring',
            session: session
        });
        const response = await this.ollama.chat({
            model: this.defaultModel,
            messages: session.messages.map(chatMessageToOllamaMessage),
            tools: this.tools
        });

        // Add the assistant's response to the session
        const chatMessage = ollamaMessageToChatMessage(response.message);
        session.messages.push(chatMessage);

        // Check if there were any tool calls in the response
        const toolCalls = response.message.tool_calls || [];

        let n_tool_messages = 0;
        for (const toolCall of toolCalls) {
            const toolFunction = toolCall.function;
            const tool = this.tools.find(t => t.function.name === toolFunction.name);
            callback?.({
                state: 'calling_tool',
                session: session,
                toolName: toolFunction.name
            });
            if (tool) {
                const toolMessage: LLMChatMessage = await tool.call(toolFunction.arguments);
                session.messages.push(toolMessage);
                n_tool_messages++;

                callback?.({
                    state: 'calling_tool',
                    session: session
                });

            } else {
                console.warn(`No tool found for function: ${toolFunction.name}`);
            }
        }

        callback?.({
            state: 'done',
            session: session
        });

        // if there are tool messages, send new messages to the LLM
        if (n_tool_messages > 0) {
            // messages are already in the session, so we just call sendMessages again
            await this.sendMessages(session, [], callback);
        }
    }
}

export const ollamaService = new OllamaService('http://localhost:11434', 'qwen3:8b', [QueryDatabaseTool]);