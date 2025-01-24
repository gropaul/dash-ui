'use client'

import {MutableRefObject, useEffect, useRef} from "react";
import EditorJS, {OutputData} from "@editorjs/editorjs";
// @ts-ignore
import DragDrop from "editorjs-drag-drop";
// @ts-ignore
import Undo from "editorjs-undo";

import "@/styles/editor-js.css";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";
import {EDITOR_JS_TOOLS} from "@/components/editor/tools";


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

export default function Editor(props: EditorProps) {

    const {readOnly = false, onToggleReadOnly} = props;
    const localEditorRef = useRef<EditorJS | null>(null);
    const editorRef = props.editorRef ?? localEditorRef;

    useEffect(() => {
        // Cleanup any existing instance
        if (editorRef.current) {
            return;
        }

        const editor = new EditorJS({
            holder: "editorjs",
            placeholder: "Start writting here..",
            readOnly,
            onReady: () => {
                new Undo({editor})
                new DragDrop(editor);
            },
            onChange: (api, event) => {
                const events = Array.isArray(event) ? event : [event];
                props.onBlockChangeEvent?.(events);

                editor.save().then((data) => {
                    props.onSaved?.(data);
                });
            },
            tools: EDITOR_JS_TOOLS,
            data: props.initialData,
            }
        );

        editorRef.current = editor;

        //add a return function handle cleanup
        return () => {
            if (editorRef.current && editorRef.current.destroy) {
                editorRef.current.destroy();
            }
        };
    }, [readOnly]);

    return (
        <div id="editorjs" className="w-[1000px] min-h-[400px] p-2"/>
    );
}
