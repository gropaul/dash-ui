import {convertToCoreMessages, LanguageModel, Message, streamText, StreamTextResult, Tool as VercelTool,} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {DataEngAssistantPrompt} from "@/components/chat/model/promts";
import {AddChartToDashboard, AddMarkdownToDashboard, QueryDatabaseTool} from "@/components/chat/model/tools";

export interface ChatSession {
    // initialPrompt?: UIMessage; // Optional initial prompt for the session
    messages: Message[];
}

export interface ServiceState {
    state: 'done' | 'inferring' | 'calling_tool';
    toolName?: string;
    session: ChatSession;
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
        messages: [initialPrompt]
    };
}

export function GetInitialState(): ServiceState {
    return {
        state: 'done',
        session: GetNewChatSession(),
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

const gpt4 = openai('gpt-4.1');

const qwen3 = openai('q5');

export const aiService = new LlmService(
    gpt4,
    {
        'queryDatabase': QueryDatabaseTool,
        'addChartToDashboard': AddChartToDashboard,
        'addMarkdownToDashboard': AddMarkdownToDashboard
    }
);
