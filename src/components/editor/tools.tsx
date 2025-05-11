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


export function getEditorJSTools(getInputManager: (blockName: string) => InputManager | null) {

    return {
        [RELATION_BLOCK_NAME]: {
            class: RelationBlockTool,
            inlineToolbar: true,
            config: {
                placeholder: "Add a new relation",
                getInputManager: getInputManager,
            },
            shortcut: "CMD+SHIFT+R",
        },
        [SELECT_BLOCK_NAME]: {
            class: SelectBlockTool,
            inlineToolbar: true,
            config: {
                placeholder: "Add a new relation",
                getInputManager: getInputManager,
            }
        },
        header: {
            class: Header as any,
            inlineToolbar: ["marker", "link"],
            config: {
                placeholder: "Header",
            },
            shortcut: "CMD+SHIFT+H",
        },
        list: {
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
        warning: Warning,
        marker: {
            class: Marker,
            shortcut: "CMD+SHIFT+M",
        },
        // code: {
        //     class: CodeTool,
        //         shortcut: "CMD+SHIFT+C",
        // },
        delimiter: Delimiter,
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