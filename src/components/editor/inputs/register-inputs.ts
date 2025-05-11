import {RELATION_BLOCK_NAME} from "@/components/editor/tools/relation.tool";
import {SELECT_BLOCK_NAME} from "@/components/editor/tools/select.tool";
import {Editor} from "@/state/editor.state";


export function registerInputs(editor: Editor) {

}

const INTERACTIVE_BLOCKS = [
    RELATION_BLOCK_NAME,
    SELECT_BLOCK_NAME,
];

export function isInteractiveBlock(blockName: string) {
    return INTERACTIVE_BLOCKS.includes(blockName);
}