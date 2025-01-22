'use client';

import {useEffect, useRef, useCallback, useState} from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";

import DragDrop from "editorjs-drag-drop";
import Header from "@editorjs/header";
import Delimiter from "@editorjs/delimiter";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import Quote from "@editorjs/quote";
import CodeTool from "@editorjs/code";
import Embed from "@editorjs/embed";
import Table from "@editorjs/table";
import LinkTool from "@editorjs/link";
import Warning from "@editorjs/warning";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import {H1} from "@/components/ui/typography";
import MarkerTool from "@/components/editor/tools/marker-tools";
import MyCustomBlock from "@/components/editor/tools/custom.tool";

// Props interface (TypeScript)
interface EditorProps {
    readOnly?: boolean;
    onToggleReadOnly?: (val: boolean) => void;
}

export default function Page() {
    const [readOnlyState, setReadOnlyState] = useState(false);

    return (
        <div className="w-full flex flex-col items-center bg-muted p-8">
            <H1>EditorJS Example</H1>

            <div className="my-4">
                <strong>Read Only: </strong>
                {readOnlyState ? 'On' : 'Off'}
            </div>

            <Editor
                readOnly={readOnlyState}
                onToggleReadOnly={(val) => setReadOnlyState(val)}
            />
        </div>
    );
}

export function Editor({ readOnly = false, onToggleReadOnly }: EditorProps) {
    const editorRef = useRef<EditorJS | null>(null);

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
                new DragDrop(editor);
            },
            onChange: (api, event) => {
                console.log("something changed", event);
            },
            tools: {
                myCustomBlock: {
                    class: MyCustomBlock,
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
            data: {
                blocks: [
                    {
                        type: "header",
                        data: {
                            text: "Editor.js",
                            level: 2,
                        },
                    },
                    {
                        type: "paragraph",
                        data: {
                            text: "Hey. Meet the new Editor. On this page you can see it in action — try to edit this text.",
                        },
                    },
                    {
                        type: "header",
                        data: {
                            text: "Key features",
                            level: 3,
                        },
                    },
                    {
                        type: "list",
                        data: {
                            items: [
                                "It is a block-styled editor",
                                "It returns clean data output in JSON",
                                "Designed to be extendable and pluggable with a simple API",
                            ],
                            style: "unordered",
                        },
                    },
                    {
                        type: "header",
                        data: {
                            text: "What does it mean «block-styled editor»",
                            level: 3,
                        },
                    },
                    {
                        type: "paragraph",
                        data: {
                            text: "Workspace in classic editors is made of a single contenteditable element, used to create different HTML markups. Editor.js workspace consists of separate Blocks: paragraphs, headings, images, lists, quotes, etc. Each of them is an independent contenteditable element.",
                        },
                    },
                    {
                        type: "header",
                        data: {
                            text: "What does it mean clean data output",
                            level: 3,
                        },
                    },
                    {
                        type: "paragraph",
                        data: {
                            text: "Classic WYSIWYG-editors produce raw HTML-markup with both content data and content appearance. Editor.js outputs JSON object with data of each Block. You can see an example below.",
                        },
                    },
                    {
                        type: "delimiter",
                        data: {},
                    },
                    {
                        type: "paragraph",
                        data: {
                            text: "Now, it can be used to create any plugin for any task. Hope you enjoy. 😏",
                        },
                    },
                    {
                        type: "image",
                        data: {
                            url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg",
                            caption: "SimpleImage block example",
                            stretched: false,
                            withBorder: true,
                            withBackground: false,
                        },
                    },
                ],
            },
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
        <div className="w-full flex flex-col items-center gap-2 relative">
            {/* Editor.js container */}
            <div id="editorjs" className="w-[1000px] min-h-[400px] bg-background p-2" />

            <div className="flex gap-4">
                <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white">
                    Save
                </button>
                <button
                    onClick={handleToggleReadOnly}
                    className="px-4 py-2 bg-gray-500 text-white"
                >
                    Toggle Readonly
                </button>
            </div>
        </div>
    );
}
