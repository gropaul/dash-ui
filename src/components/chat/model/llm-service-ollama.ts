import {Ollama} from 'ollama/browser';
import {Message as OllamaMessage, Tool as OllamaTool, ToolCall as OllamaToolCall} from "ollama";
import {AddChartToDashboard, QueryDatabaseTool} from "@/components/chat/model/tools";
import {
    LLMChatMessage,
    LLMChatRole,
    LLMTool,
    LLMToolCall,
    toolResultToString
} from "@/components/chat/model/llm-service.model";
import {LlmService, SendMessageArguments, sendMessages} from "@/components/chat/model/llm-service";

type LLMModel = 'qwen3:8b'

class LlmServiceOllama implements LlmService<OllamaMessage, OllamaTool> {
    private ollama: Ollama;
    private readonly defaultModel: LLMModel;
    private readonly tools: OllamaTool[];

    constructor(host: string, model: LLMModel, tools: LLMTool[] = []) {
        this.ollama = new Ollama({host});
        this.defaultModel = model;
        this.tools = tools;
    }

    doesAutomaticToolCalls(): boolean {
        return false; // Ollama does not support automatic tool calls
    }

    sendMessages(args: SendMessageArguments): Promise<void> {
        return sendMessages(args, this);
    }

    serviceToolToTool(serviceTool: OllamaTool): LLMTool {
        return serviceTool as LLMTool;
    }

    toolToServiceTool(tool: LLMTool): OllamaTool {
        return tool;
    }

    getAvailableTools(): LLMTool[] {
        return this.tools.map(this.serviceToolToTool);
    }

    messageToServiceMessage(message: LLMChatMessage): OllamaMessage {
        switch (message.role) {
            case 'user':
            case "assistant":
            case "system":
                return {
                    role: message.role,
                    content: message.content,
                };
            case "tool":
                return {
                    role: 'tool',
                    content: message.toolResults.reduce((acc, toolResult) => acc + toolResultToString(toolResult) + '\n', ''),
                };
        }
    }

    serviceMessageToMessage(message: OllamaMessage): LLMChatMessage {

        function transformToolCall(call: OllamaToolCall, id: number): LLMToolCall {
            return {
                id: id.toString(),
                name: call.function.name,
                arguments:  call.function.arguments
            };
        }
        const role = message.role as LLMChatRole;
        switch (role) {
            case 'user':
            case "system":
                return {
                    role: role,
                    content: message.content,
                };
            case "assistant":
                return {
                    role: 'assistant',
                    content: message.content,
                    toolCalls: message.tool_calls?.map((call, index) => transformToolCall(call, index))
                };
            case "tool":
                return {
                    role: 'tool',
                    toolResults: message.content.split('\n').filter(line => line).map((line, index) => ({
                        call_id: index.toString(),
                        name: 'unknown', // Ollama does not provide tool name in the response
                        message: line
                    }))
                };
        }
    }

    async infer(messages: LLMChatMessage[]): Promise<LLMChatMessage[]> {
        const ollamaMessages = messages.map(this.messageToServiceMessage);
        const response = await this.ollama.chat({
            model: this.defaultModel,
            messages: ollamaMessages,
            tools: this.tools
        });
        return [this.serviceMessageToMessage(response.message)];
    }
}

export const ollamaService = new LlmServiceOllama('http://localhost:11434', 'qwen3:8b', [QueryDatabaseTool, AddChartToDashboard]);