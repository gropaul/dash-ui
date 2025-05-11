import { Monaco } from "@monaco-editor/react";

export function registerInputCompletion(editor: any, monaco: Monaco) {
    const envVars = {
        "ENV_VAR_1": "value1",
        "ENV_VAR_2": "value2",
        "ENV_VAR_3": "value3"
    };

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

            const suggestions = Object.keys(envVars).map((key) => ({
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
