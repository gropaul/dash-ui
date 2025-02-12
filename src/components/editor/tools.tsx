import RelationBlockTool, {RELATION_BLOCK_TYPE} from "@/components/editor/tools/relation.tool";
import Warning from "@editorjs/warning";
import Delimiter from "@/components/editor/tools/delimiter.tools";
import InlineCode from "@editorjs/inline-code";
// @ts-ignore
import Embed from "@editorjs/embed";
// @ts-ignore
import LinkTool from "@editorjs/link";
// @ts-ignore
import Marker from "@editorjs/marker";
// @ts-ignore
import DragDrop from "editorjs-drag-drop";
// @ts-ignore
import Undo from "editorjs-undo";
import Table from "@editorjs/table";
import List from "@editorjs/list";
import Header from "@editorjs/header";

export const EDITOR_JS_TOOLS = {
    [RELATION_BLOCK_TYPE]: {
    class: RelationBlockTool,
        inlineToolbar: true,
        config: {
        placeholder: "Add a new relation",
    },
    shortcut: "CMD+SHIFT+R",
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