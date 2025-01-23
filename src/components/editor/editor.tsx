import {MutableRefObject, useCallback, useEffect, useRef} from "react";
import EditorJS, {OutputData} from "@editorjs/editorjs";
import Header from "@/components/editor/tools/header.tool";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import Warning from "@editorjs/warning";
import CodeTool from "@editorjs/code";
import Delimiter from "@/components/editor/tools/delimiter.tools";
import InlineCode from "@editorjs/inline-code";
import Embed from "@editorjs/embed";
import LinkTool from "@editorjs/link";
import Marker from "@editorjs/marker";
import DragDrop from "editorjs-drag-drop";
import Undo from "editorjs-undo";

import Table from "@editorjs/table";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";
import RelationBlockTool from "@/components/editor/tools/relation.tool";


// Props interface (TypeScript)
interface EditorProps {
    readOnly?: boolean;
    editorRef?: MutableRefObject<EditorJS | null>;
    onBlockChangeEvent?: (events: BlockMutationEvent[]) => void;
    initialData?: OutputData;
    onSaved?: (data: OutputData) => void;
    onToggleReadOnly?: (val: boolean) => void;
}

export interface EditorBlock {
    id: string;
    type: string;
    data: any;
}

export function Editor(props: EditorProps) {

    const {readOnly = false, onToggleReadOnly} = props;

    const localEditorRef = useRef<EditorJS | null>(null);
    const editorRef = props.editorRef ?? localEditorRef;

    function onAddElement() {
        if (!editorRef.current) return;
        const numberOfBlocks = editorRef.current.blocks.getBlocksCount();
        // add a new paragraph block at the end
        editorRef.current.blocks.insert("paragraph", {
            text: "New paragraph block",
        }, {}, numberOfBlocks);
    }

    /**
     * Create or re-create Editor.js on mount or when readOnly changes
     */
    useEffect(() => {
        // Cleanup any existing instance
        if (editorRef.current) {
            editorRef.current.destroy();
        }

        const editor = new EditorJS({

                /**
                 * Editor.js configuration
                 */
                holder: "editorjs",
                readOnly,
                onReady: () => {
                    new Undo({ editor })
                    new DragDrop(editor);
                },
                onChange: (api, event) => {
                    if (props.onBlockChangeEvent) {
                        // create list if event is not an array
                        const events = Array.isArray(event) ? event : [event];
                        props.onBlockChangeEvent(events);
                    }

                    if (props.onSaved) {
                        editor.save().then((data) => {
                            if (props.onSaved) {
                                props.onSaved(data);
                            }
                        });
                    }
                },
                tools: {
                    relation: {
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
                    quote: {
                        class: Quote,
                        inlineToolbar: true,
                        config: {
                            quotePlaceholder: "Enter a quote",
                            captionPlaceholder: "Quote's author",
                        },
                        shortcut: "CMD+SHIFT+O",
                    },
                    warning: Warning,
                    marker: {
                        class: Marker,
                        shortcut: "CMD+SHIFT+M",
                    },
                    code: {
                        class: CodeTool,
                        shortcut: "CMD+SHIFT+C",
                    },
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
                },
                data: props.initialData,
            }
        );

        editorRef.current = editor;

        // Cleanup
        return () => {
            editor.destroy();
            editorRef.current = null;
        };
    }, [readOnly]);

    /**
     * Manual save function
     */
    const handleSave = useCallback(async () => {
        if (!editorRef.current) return;

        try {
            const outputData: OutputData = await editorRef.current.save();
            console.log("Manual save: ", outputData);
        } catch (error) {
            console.error("Error saving Editor.js data", error);
        }
    }, []);

    /**
     * Toggle read-only
     */
    const handleToggleReadOnly = useCallback(async () => {
        if (!editorRef.current) return;

        // Toggle via Editor.js readOnly API
        const newState = await editorRef.current.readOnly.toggle();
        console.log("New readOnly state:", newState);

        // Sync with parent (if we want the parent to know)
        if (onToggleReadOnly) {
            onToggleReadOnly(newState);
        }
    }, [onToggleReadOnly]);

    return (
        <div id="editorjs" className="w-[1000px] min-h-[400px] p-2"/>
    );
}
