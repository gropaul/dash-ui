import {Monaco} from "@monaco-editor/react"; // for types and editor APIs


// create a little zustand state to check if the editor is already registered


export function registerHotkeys(
    editor: any,
    monaco: Monaco,
    runQuery?: () => void
) {

    const executeAction =  {
        id: "run-code",
        label: "Run Query",
        contextMenuOrder: 2,
        contextMenuGroupId: "1_modification",
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        ],
        run: () => {
            if (runQuery) {
                runQuery();
            }
        },
    }
    editor.addAction(executeAction);

    const enterAction =  {
        id: "insert-new-line",
        label: "Insert New Line",
        contextMenuOrder: 1,
        contextMenuGroupId: "1_modification",
        keybindings: [
            monaco.KeyCode.Enter],
        run: (ed: any) => {
            ed.trigger('keyboard', 'type', { text: '\n' });
        }
    }
    editor.addAction(enterAction);

}