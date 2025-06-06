
import {LLMChatMessage} from "@/components/chat/model/llm-service.model";
import {SendMessageArguments, sendMessages} from "@/components/chat/model/llm-service";
import {CoreMessage, generateText, LanguageModel, tool, Tool as VercelTool, ToolExecutionOptions} from 'ai';

class LlmServiceVercelAI {
    private readonly defaultModel: LanguageModel;
    private readonly tools: Record<string, VercelTool>;

    constructor(model: LanguageModel, tools: Record<string, VercelTool>) {
        this.defaultModel = model;
        this.tools = tools;
    }

    doesAutomaticToolCalls(): boolean {
        return true; // Vercel does support automatic tool calls
    }

    sendMessages(args: SendMessageArguments): Promise<void> {
        return sendMessages(args, this);
    }

    messageToServiceMessage(message: LLMChatMessage): CoreMessage {
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
                    content: message.toolResults.map(toolResult => ({
                        type: 'tool-result',
                        toolCallId: toolResult.call_id,
                        toolName: toolResult.name,
                        result: toolResult.message,
                    })),
                };
        }
    }

    serviceMessageToMessage(message: CoreMessage): LLMChatMessage {
        switch (message.role) {
            case "system":
            case "assistant":
            case "user":
                let stringContent = '';
                let reasoning = '';
                const content = message.content;
                if (typeof content === 'string') {
                    stringContent = content;
                } else if (Array.isArray(content)) {
                    console.warn('Processing content as an array:', content);
                    for (const item of content) {
                        console.log('Processing item:', item);
                        const type = item.type;
                        switch (type) {
                            case 'text':
                                stringContent += item.text;
                                break;
                            case 'reasoning':
                                reasoning += item.text;
                                break;
                            case 'tool-call':
                                stringContent += `Tool call: ${item.toolCallId} - ${item.toolName}\n`;
                                break;

                        }
                    }
                }
                console.log('Processed content:', stringContent, 'Reasoning:', reasoning);
                return {
                    role: message.role,
                    content: stringContent,
                    reasoning: reasoning
                };
            case "tool":
                return {
                    role: 'tool',
                    toolResults: message.content.map(toolResult => ({
                        call_id: toolResult.toolCallId,
                        name: toolResult.toolName,
                        message: toolResult.result as string, // todo: ensure result is a string
                    })),
                };
        }
    }

    async infer(messages: LLMChatMessage[]): Promise<LLMChatMessage[]> {
        const serviceMessages = messages.map(this.messageToServiceMessage.bind(this));
        console.log('Infer messages:', serviceMessages);
        console.log('Using model:', this.defaultModel);
        console.log('Using tools:', Object.keys(this.tools));
        const response = await generateText({
            model: this.defaultModel,
            messages: serviceMessages,
            tools: this.tools,
            maxSteps: 10,
        });

        console.log('Infer response:', response);

        return response.response.messages.map(this.serviceMessageToMessage.bind(this));

    }
}

import {createOpenAI} from '@ai-sdk/openai';
import {z} from "zod";

const openai = createOpenAI({
    // custom settings, e.g.
    compatibility: 'strict', // strict mode, enable when using the OpenAI API
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // your OpenAI API key
});

const model = openai('gpt-3.5-turbo');

const WeatherTool = tool({
        description: 'Get the weather in a location',
        parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
    });

export const vercelaiService = new LlmServiceVercelAI(
    model,
    {
        'weather': WeatherTool,
    }
);
