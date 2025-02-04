import {Monaco} from "@monaco-editor/react";



export function registerHotkeys(monaco: Monaco, onRun?: () => void) {
    const executeAction =  {
        id: "run-code",
        label: "Run Code",
        contextMenuOrder: 2,
        contextMenuGroupId: "1_modification",
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        ],
        run: () => {
            if (onRun) {
                onRun();
            }
        }
    }
    monaco.editor.addEditorAction(executeAction)


}