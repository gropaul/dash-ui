'use client'

import {useEffect, useRef} from "react";
import EditorJS, {OutputData} from "@editorjs/editorjs";
// @ts-ignore
import DragDrop from "editorjs-drag-drop";
// @ts-ignore
import Undo from "editorjs-undo";

import "@/styles/editor-js.css";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";
import {EDITOR_JS_TOOLS} from "@/components/editor/tools";
import {useEditorStore} from "@/state/editor.state";


// Props interface (TypeScript)
interface EditorProps {
    id: string;
    readOnly?: boolean;
    onBlockChangeEvent?: (events: BlockMutationEvent[]) => void;
    initialData?: OutputData;
    onSaved?: (data: OutputData) => void;
    onReady?: (editor: EditorJS) => void;
    onToggleReadOnly?: (val: boolean) => void;
}

export default function Editor(props: EditorProps) {

    const {readOnly = false, onToggleReadOnly} = props;
    const editorRef = useRef<EditorJS | null>(null);
    const {setEditor, removeEditor} = useEditorStore(); // Zustand action to set editorRef

    useEffect(() => {
        // Clean up any existing instance
        if (editorRef.current) {
            return;
        }

        const editor = new EditorJS({
                holder: props.id,
                placeholder: "Start writing here..",
                readOnly: false,
                onReady: () => {
                    new Undo({editor})
                    new DragDrop(editor);
                    setEditor(props.id, editor);
                    if (props.onReady) {
                        props.onReady(editor);
                    }
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
                removeEditor(props.id);
            }
        };


    }, [readOnly]);

    return (
        <div id={props.id} className="w-full min-h-[400px] p-2"/>
    );
}
