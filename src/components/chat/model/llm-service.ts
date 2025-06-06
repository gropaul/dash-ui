import {ChatSession, GUICallback, LLMChatMessage, LLMTool} from "@/components/chat/model/llm-service.model";
import {DEFAULT_LLM_SETTINGS} from "@/platform/global-data";

export interface SendMessageArguments {
    session: ChatSession,
    newMessages: LLMChatMessage[],
    options: SendMessagesOptions
}

export interface SendMessagesOptions {
    maxCycleCount?: number, // optional, to limit the number of cycles
    callback?: GUICallback,
}

export async function sendMessages(args: SendMessageArguments, service: LlmService<any, any>): Promise<void> {
    const {session, newMessages, options} = args;
    // call the Ollama API with the session newMessages
    session.messages.push(...newMessages);
    options.callback?.({
        state: 'inferring',
        session: session
    });

    // get the last messages to send to the LLM, respecting the maxMessagesToPrompt setting
    const messagesToSend = session.messages.slice(-DEFAULT_LLM_SETTINGS.maxMessagesToPrompt);

    // add the initial prompt if it exists
    if (session.initialPrompt) {
        messagesToSend.unshift(session.initialPrompt);
    }
    // infer the LLM response
    const responses = await service.infer(messagesToSend);

    let n_tool_messages = 0;

    for (const response of responses) {
        session.messages.push(response);
        if (!service.doesAutomaticToolCalls()) {
            // Check if there were any tool calls in the response
            const toolCalls = response.role == 'assistant' && response.toolCalls || [];
            for (const toolCall of toolCalls) {
                const toolName = toolCall.name;
                const tools = service.getAvailableTools();
                const tool = tools.find(t => t.function.name === toolName);
                options.callback?.({
                    state: 'calling_tool',
                    session: session,
                    toolName: toolName
                });
                if (tool) {
                    const toolMessage: LLMChatMessage = await tool.call(toolCall);
                    session.messages.push(toolMessage);
                    n_tool_messages++;

                    options.callback?.({
                        state: 'calling_tool',
                        session: session
                    });

                } else {
                    console.warn(`No tool found for function: ${toolName}`);
                }
            }
        }
    }


    options.callback?.({
        state: 'done',
        session: session
    });

    // if there are tool messages, send new messages to the LLM
    if (n_tool_messages > 0) {
        // messages are already in the session, so we just call sendMessages again
        if (options.maxCycleCount && options.maxCycleCount <= 0) {
            return;
        } else if (options.maxCycleCount) {
            options.maxCycleCount--;
        }
        await sendMessages({
            session: session,
            newMessages: [],
            options: options
        }, service);
    }
}

export interface LlmService<ServiceLLMChatMessage, ServiceLLMTool> {

    messageToServiceMessage(message: LLMChatMessage): ServiceLLMChatMessage;

    serviceMessageToMessage(serviceMessage: ServiceLLMChatMessage): LLMChatMessage;

    sendMessages(args: SendMessageArguments): Promise<void>;

    infer(messages: LLMChatMessage[]): Promise<LLMChatMessage[]>;

    doesAutomaticToolCalls(): boolean;
}