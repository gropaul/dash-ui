import EditorJS from "@editorjs/editorjs";
import {RELATION_BLOCK_NAME, RelationBlockData} from "@/components/editor/tools/relation.tool";
import {SELECT_BLOCK_NAME} from "@/components/editor/tools/select.tool";
import {RegisterInputManagerParams, InputDependency, InputValue} from "@/components/editor/inputs/models";

export interface InputChangeParams {
    blockId: string;
    inputName: string;
    inputValue: InputValue;
}

export class InputManager {
    dependencies: InputDependency[] = [];

    registerInputDependency(dependency: InputDependency) {
        this.dependencies.push(dependency);
    }

    onInputChange(params: InputChangeParams) {
        for (const dependency of this.dependencies) {
            if (dependency.inputName === params.inputName) {
                dependency.callFunction(params.inputValue);
            }
        }
    }
}

function CreateInputManager(editor: EditorJS){

    const inputManager = new InputManager();
    const blocks = editor.blocks.getBlocksCount();

    for (let i = 0; i < blocks; i++) {
        const block = editor.blocks.getBlockByIndex(i);
        if (block && block.name === RELATION_BLOCK_NAME) {
            const params: RegisterInputManagerParams = {
                blockId: block.id,
                inputManager: inputManager,
            }
            block.call('registerInputManager', params );
        } else if (block && block.name === SELECT_BLOCK_NAME) {
            const params: RegisterInputManagerParams = {
                blockId: block.id,
                inputManager: inputManager,
            }
            block.call('registerInputManager', params);
        }
    }
}

function findInputs(editor: EditorJS) {
    const blocks = editor.blocks.getBlocksCount();
    const relationBlocks: RelationBlockData[] = [];

    for (let i = 0; i < blocks; i++) {
        const block = editor.blocks.getBlockByIndex(i);
        if (block && block.name === SELECT_BLOCK_NAME) {
        }
    }
}

export function registerInputs(editor: EditorJS) {
    CreateInputManager(editor);


    // for (const relationBlock of relationBlocks) {
    //     const block = editor.blocks.getById(relationBlock.id!);
    //     if (block) {
    //         // render the block every 5s
    //         for (let i = 0; i < 10; i++) {
    //             setTimeout(() => {
    //                 block.call('rerunQuery');
    //                 console.log(`Rendering block ${relationBlock.id}...`);
    //             }, i * 5000);
    //         }
    //     }
    // }
}
