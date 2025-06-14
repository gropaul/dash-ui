import {convertToCoreMessages, Message, streamText, StreamTextResult, Tool as VercelTool,} from 'ai';

import {DataEngAssistantPrompt} from "@/components/chat/model/promts";
import {
    AddChartToDashboard,
    AddMarkdownToDashboard,
    AddTableToDashboard,
    QueryDatabaseTool
} from "@/components/chat/model/tools";
import {useLanguageModelState} from "@/state/language-model.state";

export interface ChatSession {
    // initialPrompt?: UIMessage; // Optional initial prompt for the session
    id: string; // Unique identifier for the session
    name: string; // Optional name for the session
    dateTimeCreated: string; // Date and time when the session was created, formatted as iSO string
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
    const now = new Date();
    const dateTimeCreated = now.toISOString();
    return {
        id: crypto.randomUUID().toString(),
        name: 'Chat of ' + new Date().toLocaleDateString(),
        dateTimeCreated: dateTimeCreated,
        messages: [initialPrompt]
    };
}

class LlmService {
    private readonly tools: Record<string, VercelTool>;

    constructor(tools: Record<string, VercelTool>) {
        this.tools = tools;
    }

    streamText(messages: Message[]): StreamTextResult<any, any> {
        console.log('streamText called with messages:', messages);

        // Get the current language model from state
        const model = useLanguageModelState.getState().getLanguageModel();

        return streamText({
            model: model,
            messages: convertToCoreMessages(messages),
            tools: this.tools,
            maxSteps: 8,
        })
    }
}

// Note: We no longer need to create hardcoded models here
// The models are now configured through the language model settings

export const TOOL_NAME_EXECUTE_QUERY = 'executeQuery';
export const TOOL_NAME_ADD_CHART_TO_DASHBOARD = 'addChartToDashboard';
export const TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD = 'addMarkdownToDashboard';
export const TOOL_NAME_ADD_TABLE_TO_DASHBOARD = 'addTableToDashboard';
// type that must contain one of the tool names
export type ToolName = typeof TOOL_NAME_EXECUTE_QUERY | typeof TOOL_NAME_ADD_CHART_TO_DASHBOARD | typeof TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD;


export const aiService = new LlmService(
    {
        [TOOL_NAME_ADD_CHART_TO_DASHBOARD]: AddChartToDashboard,
        [TOOL_NAME_ADD_MARKDOWN_TO_DASHBOARD]: AddMarkdownToDashboard,
        [TOOL_NAME_EXECUTE_QUERY]: QueryDatabaseTool,
        [TOOL_NAME_ADD_TABLE_TO_DASHBOARD]: AddTableToDashboard
    }
);
