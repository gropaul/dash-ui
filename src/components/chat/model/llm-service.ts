import {convertToCoreMessages, LanguageModel, Message, streamText, StreamTextResult, Tool as VercelTool,} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';

import {DataEngAssistantPrompt} from "@/components/chat/model/promts";
import {AddChartToDashboard, AddMarkdownToDashboard, QueryDatabaseTool} from "@/components/chat/model/tools";

export interface ChatSession {
    // initialPrompt?: UIMessage; // Optional initial prompt for the session
    id: string; // Unique identifier for the session
    name: string; // Optional name for the session
    dateCreated: Date; // Date when the session was created
    messages: Message[];
}

export function GetNewChatSession(): ChatSession {

    const initialPrompt: Message =  {
    id: crypto.randomUUID().toString(),
        role: 'system',
        content: '',
        parts: [{
            text: DataEngAssistantPrompt,
            type: 'text',
        }],
    };
    return {
        id: crypto.randomUUID().toString(),
        name: 'Chat of ' + new Date().toLocaleDateString(),
        dateCreated: new Date(),
        messages: [initialPrompt]
    };
}

class LlmService {
    private readonly defaultModel: LanguageModel;
    private readonly tools: Record<string, VercelTool>;

    constructor(model: LanguageModel, tools: Record<string, VercelTool>) {
        this.defaultModel = model;
        this.tools = tools;
    }

    streamText(messages: Message[]): StreamTextResult<any, any> {
        return streamText({
            model: this.defaultModel,
            messages: convertToCoreMessages(messages),
            tools: this.tools,
            maxSteps: 10,
        })
    }
}

const openai = createOpenAI({
    // custom settings, e.g.
    compatibility: 'strict', // strict mode, enable when using the OpenAI API
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // your OpenAI API key
});

const ollama = createOllama({
    baseURL: 'http://localhost:11434/api',
});

// see https://platform.openai.com/docs/pricing

const gpt4 = openai('gpt-4.1');
const gpt4Nano = openai('gpt-4.1-nano');
const qwen3 = ollama('qwen3:8b', {
    simulateStreaming: true
})

export const TOOL_NAME_EXECUTE_QUERY = 'executeQuery';
export const TOOL_NAME_ADD_CHART_TO_DASHBOARD = 'addChartToDashboard';
export const TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD = 'addMarkdownToDashboard';

// type that must contain one of the tool names
export type ToolName = typeof TOOL_NAME_EXECUTE_QUERY | typeof TOOL_NAME_ADD_CHART_TO_DASHBOARD | typeof TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD;


export const aiService = new LlmService(
    gpt4Nano,
    {
        [TOOL_NAME_ADD_CHART_TO_DASHBOARD]: AddChartToDashboard,
        [TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD]: AddMarkdownToDashboard,
        [TOOL_NAME_EXECUTE_QUERY]: QueryDatabaseTool,
    }
);
