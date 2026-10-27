import React from "react";
import {CopyButton} from "@/components/basics/input/copy-button";
import {CodeFenceButtonProps} from "@/components/basics/sql-editor/editor-button-panel";
import {RunButton} from "@/components/basics/sql-editor/run-button-content";


/** Copy and run over the editor's top right corner, shown while the pointer is over the editor or it has focus. */
export function EditorButtonOverlay(props: CodeFenceButtonProps) {

    return (
        <div className="opacity-0 transition-opacity group-focus-within/sql-editor:opacity-100 group-hover/sql-editor:opacity-100">
            {props.showCopyButton && (
                <div className="absolute top-4 right-4">
                    <CopyButton textToCopy={props.copyCode}  size={18} />
                </div>
            )}
            {props.showRunButton && (
                <button
                    onClick={props.onRun}
                    disabled={props.onRun == undefined}
                    className="absolute top-4 right-14 hover:text-black text-gray-900"
                >
                    <RunButton {...props} />
                </button>
            )}
        </div>
    );
}
