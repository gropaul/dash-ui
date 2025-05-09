import {Monaco} from "@monaco-editor/react";
import {createWithEqualityFn} from "zustand/traditional";


// create a little zustand state to check if the editor is already registered

interface HotkeyState {
    editorExists: boolean;
    setEditorExists: (exists: boolean) => void;
}

const useHotkeyState = createWithEqualityFn<HotkeyState>((set) => ({
    editorExists: false,
    setEditorExists: (exists: boolean) => set({editorExists: exists}),
}));

export function registerHotkeys(monaco: Monaco, runQuery?: () => void) {

    const editorExists = useHotkeyState.getState().editorExists;
    if (editorExists) {
        return;
    }

    useHotkeyState.getState().setEditorExists(true);

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

    monaco.editor.addEditorAction(executeAction);
}