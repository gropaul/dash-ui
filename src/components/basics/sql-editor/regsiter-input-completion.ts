import {Monaco} from "@monaco-editor/react";
import {InputManager} from "@/components/editor/inputs/input-manager";

export function registerInputCompletion(editor: any, monaco: Monaco, inputManager?: InputManager) {

    if (!inputManager) {
        console.warn("Input manager is not provided. Skipping input completion registration.");
        return;
    }

    editor.onDidChangeModelContent(() => {
        const position = editor.getPosition();
        const model = editor.getModel();
        if (!position || !model) return;

        const line = model.getLineContent(position.lineNumber);
        const prefix = line.substring(0, position.column - 1);

        // If we're right after {{
        if (prefix.endsWith("{{")) {
            editor.trigger("manual", "editor.action.triggerSuggest", {});
        }
    });

    monaco.languages.registerCompletionItemProvider("sql", {
        triggerCharacters: ["{"],
        provideCompletionItems(model, position) {
            const lineContent = model.getLineContent(position.lineNumber);
            const prefix = lineContent.substring(0, position.column - 1);

            // Only show suggestions after {{
            if (!prefix.endsWith("{{")) {
                return { suggestions: [] };
            }

            const suffix = lineContent.substring(position.column - 1); // From current cursor onward
            const hasClosingBraces = suffix.trimStart().startsWith("}}");

            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
            };
            const vars = inputManager.getAvailableInputs();
            const suggestions = Object.keys(vars).map((key) => ({
                label: key,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: hasClosingBraces ? key : `${key}}}`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range
            }));

            return { suggestions };
        }
    });
}
