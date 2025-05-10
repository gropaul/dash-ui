import EditorJS from "@editorjs/editorjs";
import {RELATION_BLOCK_NAME, RelationBlockData} from "@/components/editor/tools/relation.tool";
import {SELECT_BLOCK_NAME} from "@/components/editor/tools/select.tool";
import {GetDependenciesParams, GetSourcesParams, InputDependency, InputValue} from "@/components/editor/inputs/models";


function findInputDependencies(editor: EditorJS){

    const blocks = editor.blocks.getBlocksCount();
    let dependencies: InputDependency[] = [];

    function setDependencies(newDependencies: InputDependency[]) {
        dependencies.push(...newDependencies);
        console.log("Dependencies: ", dependencies);
    }

    function onInputChange(inputName: string, inputValue: InputValue) {
        for (const dependency of dependencies) {
            if (dependency.inputName === inputName) {
                dependency.callFunction(inputValue);
            }
        }
    }

    for (let i = 0; i < blocks; i++) {
        const block = editor.blocks.getBlockByIndex(i);
        if (block && block.name === RELATION_BLOCK_NAME) {
            const params: GetDependenciesParams = {
                blockId: block.id,
                callback: setDependencies,
            }
            block.call('getDependencies', params );
        } else if (block && block.name === SELECT_BLOCK_NAME) {
            const params: GetSourcesParams = {
                blockId: block.id,
                callback: (sources) => {
                    console.log("Sources for block: ", sources);
                },
                notifyOnChange: onInputChange,
            }
            block.call('getSources', params);
        }
    }

    for (const dependency of dependencies) {
        console.log("Dependency: ", dependency);
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
    findInputDependencies(editor);


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
