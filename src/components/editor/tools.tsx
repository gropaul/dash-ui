import RelationBlockTool, {RELATION_BLOCK_NAME} from "@/components/editor/tools/relation.tool";
import Warning from "@editorjs/warning";
import Delimiter from "@/components/editor/tools/delimiter.tools";
import InlineCode from "@editorjs/inline-code";
// @ts-ignore
import Embed from "@editorjs/embed";
// @ts-ignore
import LinkTool from "@editorjs/link";
// @ts-ignore
import Marker from "@editorjs/marker";
import Table from "@editorjs/table";
import List from "@editorjs/list";
import Header from "@editorjs/header";
import SelectBlockTool, {SELECT_BLOCK_NAME} from "@/components/editor/tools/select.tool";
import {InputManager} from "@/components/editor/inputs/input-manager";
import TextSearchBlockTool, {TEXT_SEARCH_BLOCK_NAME} from "@/components/editor/tools/text.tool";

export const PARAGRAPH_BLOCK_NAME = "paragraph";
export const HEADER_TOOL_NAME = "header";
export const LIST_TOOL_NAME = "list";
export const WARNING_TOOL_NAME = "warning";
export const DELIMITER_TOOL_NAME = "delimiter";

export function getEditorJSTools(getInputManager: (blockName: string) => InputManager | null) {
    const DEFAULT_CONFIG: any = {
            placeholder: "Add a new relation",
            getInputManager: getInputManager,
        }
    return {
        [RELATION_BLOCK_NAME]: {
            class: RelationBlockTool,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+R",
            config: DEFAULT_CONFIG,
        },
        [SELECT_BLOCK_NAME]: {
            class: SelectBlockTool,
            inlineToolbar: true,
            config: DEFAULT_CONFIG,
        },
        [TEXT_SEARCH_BLOCK_NAME]: {
            class: TextSearchBlockTool,
            inlineToolbar: true,
            config: {
                getInputManager: getInputManager,
            }
        },
        [HEADER_TOOL_NAME] : {
            class: Header as any,
            inlineToolbar: ["marker", "link"],
            config: {
                placeholder: "Header",
            },
            shortcut: "CMD+SHIFT+H",
        },
        [LIST_TOOL_NAME] : {
            class: List as any,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+L",
        },
        // quote: {
        //     class: Quote,
        //         inlineToolbar: true,
        //         config: {
        //         quotePlaceholder: "Enter a quote",
        //             captionPlaceholder: "Quote's author",
        //     },
        //     shortcut: "CMD+SHIFT+O",
        // },
        [WARNING_TOOL_NAME] : Warning,
        marker: {
            class: Marker,
            shortcut: "CMD+SHIFT+M",
        },
        // code: {
        //     class: CodeTool,
        //         shortcut: "CMD+SHIFT+C",
        // },
        [DELIMITER_TOOL_NAME] : Delimiter,
        inlineCode: {
            class: InlineCode,
            shortcut: "CMD+SHIFT+C",
        },
        linkTool: LinkTool,
        embed: Embed,
        table: {
            class: Table as any,
            inlineToolbar: true,
            shortcut: "CMD+ALT+T",
        },
    };
}