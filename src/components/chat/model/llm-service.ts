import {convertToModelMessages, UIMessage, streamText, StreamTextResult, ToolSet, stepCountIs,} from 'ai';

import {DataEngAssistantPrompt} from "@/components/chat/model/promts";
import {
    ChartTool,
    MarkdownTool,
    QueryDatabaseTool,
    ReadTargetTool,
    TableTool,
} from "@/components/chat/model/tools";
import {useLanguageModelState} from "@/state/language-model.state";
import {getProviderRegistry} from "@/components/chat/providers";

export interface ChatSession {
    // initialPrompt?: UIMessage; // Optional initial prompt for the session
    id: string; // Unique identifier for the session
    name: string; // Optional name for the session
    dateTimeCreated: string; // Date and time when the session was created, formatted as iSO string
    messages: UIMessage[];
}

export function GetNewChatSession(): ChatSession {

    const initialPrompt: UIMessage =  {
    id: crypto.randomUUID().toString(),
        role: 'system',
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
    private readonly tools: ToolSet;

    constructor(tools: ToolSet) {
        this.tools = tools;
    }

    async prepareModel(onProgress: (progress: number) => void): Promise<void> {
        const state = useLanguageModelState.getState();
        const provider = getProviderRegistry().getProvider(state.activeProviderId);
        if (provider?.prepareModel) {
            await provider.prepareModel(onProgress);
        }
    }

    async streamText(messages: UIMessage[]): Promise<StreamTextResult<any, any>> {

        // Get the current language model from state
        const model = useLanguageModelState.getState().getLanguageModel();

        return streamText({
            model: model,
            messages: await convertToModelMessages(messages),
            tools: this.tools,
            stopWhen: stepCountIs(8),
        });
    }
}

// Note: We no longer need to create hardcoded models here
// The models are now configured through the language model settings

export const TOOL_NAME_EXECUTE_QUERY = 'executeQuery';
export const TOOL_NAME_CHART = 'chart';
export const TOOL_NAME_TABLE = 'table';
export const TOOL_NAME_MARKDOWN = 'markdown';
export const TOOL_NAME_READ_TARGET = 'readTarget';

// type that must contain one of the tool names
export type ToolName =
    typeof TOOL_NAME_EXECUTE_QUERY |
    typeof TOOL_NAME_CHART |
    typeof TOOL_NAME_TABLE |
    typeof TOOL_NAME_MARKDOWN |
    typeof TOOL_NAME_READ_TARGET;


export const aiService = new LlmService(
    {
        [TOOL_NAME_EXECUTE_QUERY]: QueryDatabaseTool,
        [TOOL_NAME_CHART]: ChartTool,
        [TOOL_NAME_TABLE]: TableTool,
        [TOOL_NAME_MARKDOWN]: MarkdownTool,
        [TOOL_NAME_READ_TARGET]: ReadTargetTool,
    }
);

// map that takes a tool name to the tool display name
export const ToolDisplayNameMap: Record<string, string> = {
    [TOOL_NAME_EXECUTE_QUERY]: 'Execute Query',
    [TOOL_NAME_CHART]: 'Chart',
    [TOOL_NAME_TABLE]: 'Table',
    [TOOL_NAME_MARKDOWN]: 'Markdown',
    [TOOL_NAME_READ_TARGET]: 'Read Target',
};
