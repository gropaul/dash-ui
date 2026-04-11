import { Monaco } from "@monaco-editor/react";
import { registerCompletion } from "monacopilot";
import { generateText } from "ai";
import { WebLLMProvider } from "@/components/chat/providers/webllm-provider";

const completionProvider = new WebLLMProvider({
    model: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
    customModel: "",
});

export function registerAiCompletion(editor: any, monaco: Monaco) {
    return registerCompletion(monaco, editor, {
        language: "sql",
        trigger: "onTyping",
        onCompletionShown: (completion, range) => {
            console.log('Completion shown:', completion, range);
        },
        onCompletionAccepted: () => {
            console.log('Completion accepted');
        },
        onCompletionRejected: () => {
            console.log('Completion rejected');
        },
        onError: (error) => {
            console.error('Monacopilot error:', error);
        },
        requestHandler: async ({ body }) => {
            try {
                console.log('AI completion request received with metadata:', body.completionMetadata);
                const model = await completionProvider.getModel();
                const { textBeforeCursor, textAfterCursor } =  body.completionMetadata;
                const systemPrompt = `You are a code completion assistant. Complete the SQL at the cursor position (marked with <CURSOR>). Output ONLY the completion text to insert — no explanation, no markdown, no backticks. If no meaningful completion exists, output an empty string. You will get a snipped {textBeforeCursor}CURSOR{textAfterCursor}`;
                const prompt = `${textBeforeCursor}<CURSOR>${textAfterCursor}`;
                console.log(`Promt:`, prompt, `System prompt:`, systemPrompt);
                const { text } = await generateText({ model, system: systemPrompt, prompt});
                console.log('AI completion response:', text);

                return { completion: text.trim() };
            } catch (err) {
                console.error("AI completion error:", err);
                return { completion: "" };
            }
        },
    });
}
