import EditorJS from "@editorjs/editorjs";
import {RELATION_BLOCK_NAME, RelationBlockData} from "@/components/editor/tools/relation.tool";
import {SELECT_BLOCK_NAME} from "@/components/editor/tools/select.tool";
import {RegisterInputManagerParams, InputDependency, InputValue, InputSource} from "@/components/editor/inputs/models";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {Editor} from "@/state/editor.state";


export function registerInputs(editor: Editor) {
    initializeInputs(editor.editor, editor.manager);
}

const INTERACTIVE_BLOCKS = [
    RELATION_BLOCK_NAME,
    SELECT_BLOCK_NAME,
];

export function isInteractiveBlock(blockName: string) {
    return INTERACTIVE_BLOCKS.includes(blockName);
}

function initializeInputs(editor: EditorJS, inputManager: InputManager) {
    const blocks = editor.blocks.getBlocksCount();

    for (let i = 0; i < blocks; i++) {
        const block = editor.blocks.getBlockByIndex(i);
        if (block && block.name && isInteractiveBlock(block.name)) {
            const params: RegisterInputManagerParams = {
                blockId: block.id,
                inputManager: inputManager,
            }
            block.call('registerInputManager', params);
        }
    }

    // log all dependencies and sources of the input manager
    console.log("Input dependencies: ", inputManager.dependencies);
    console.log("Input sources: ", inputManager.sources);
}

