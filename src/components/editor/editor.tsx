'use client'

import {useEffect, useRef} from "react";
import EditorJS, {OutputData} from "@editorjs/editorjs";
// @ts-ignore
import DragDrop from "editorjs-drag-drop";
// @ts-ignore
import Undo from "editorjs-undo";

import "@/styles/editor-js.css";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";
import {getEditorJSTools} from "@/components/editor/tools";
import {Editor as EditorStore, useEditorStore} from "@/state/editor.state";
import {InputManager} from "@/components/editor/inputs/input-manager";


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

        const inputManager = new InputManager();
        const blockNamesLoaded = new Set<string>();
        const getInputManager = (blockName: string) => {
            // only return the input manager if the block name is not already loaded
            // as the first call is by some internal editorjs function
            if (blockNamesLoaded.has(blockName)) {
                return inputManager;
            } else {
                blockNamesLoaded.add(blockName);
                return null;
            }
        }
        console.log("inputManager useEffect", inputManager);
        const editor = new EditorJS({
                holder: props.id,
                placeholder: "Start writing here..",
                readOnly: false,

                onReady: () => {
                    new Undo({editor})
                    new DragDrop(editor);
                    const editorStore: EditorStore = {
                        editor: editor,
                        manager: inputManager,
                    }
                    setEditor(props.id, editorStore);
                    if (props.onReady) {
                        props.onReady(editor);
                    }
                },
                onChange: (api, event) => {
                    const events = Array.isArray(event) ? event : [event];

                    const editorStore = useEditorStore().getEditor(props.id);
                    if (editorStore) {
                        editorStore.manager.onBlockChangeEvent(events);
                    }
                    props.onBlockChangeEvent?.(events);
                    editor.save().then((data) => {
                        props.onSaved?.(data);
                    });
                },

                tools: getEditorJSTools(getInputManager),
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
