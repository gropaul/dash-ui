import EditorJS from '@editorjs/editorjs';
import {InputManager} from "@/components/editor/inputs/input-manager";

// we need long living instances of the editor, so we need a singleton as updating the
// zustand store will cause a copy of the state to be created and the editor to be re-initialized

export interface Editor {
    editor: EditorJS;
    manager: InputManager
}

export class EditorsService {
    // singleton instance
    private static instance: EditorsService;

    editors: { [key: string]: Editor };

    private constructor() {
        this.editors = {};
    }

    static getInstance(): EditorsService {
        if (!EditorsService.instance) {
            EditorsService.instance = new EditorsService();
        }
        return EditorsService.instance;
    }

    hasEditor(id: string) {
        return this.editors[id] !== undefined;
    }

    getEditor(id: string) {
        return this.editors[id];
    }

    setEditor(id: string, editor: Editor) {
        this.editors[id] = editor;
    }

    removeEditor(id: string) {
        delete this.editors[id];
    }

}

interface EditorState {
    setEditor: (id: string, editor: Editor) => void;
    removeEditor: (id: string) => void;
    getEditor: (id: string) => Editor;
    hasEditor: (id: string) => boolean;
}

export const useEditorStore = (): EditorState => ({
    setEditor: (id, editor) => {
        EditorsService.getInstance().setEditor(id, editor);
    },
    removeEditor: (id) => {
        EditorsService.getInstance().removeEditor(id);
    },
    getEditor: (id) => {
        return EditorsService.getInstance().getEditor(id);
    },
    hasEditor: (id) => {
        return EditorsService.getInstance().hasEditor(id);
    }
});
