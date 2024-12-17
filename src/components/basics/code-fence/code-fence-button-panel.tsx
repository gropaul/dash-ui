import React from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {CopyButton} from "@/components/basics/input/copy-button";
import {getRunButtonContent} from "@/components/basics/code-fence/run-button-content";

export interface CodeFenceButtonProps {
    showCopyButton: boolean;
    copyCode: string;

    showRunButton?: boolean;
    onRun?: () => void;
    runText: string;
    executionState: TaskExecutionState;
}

export function CodeFenceButtonPanel(props: CodeFenceButtonProps) {

    return (
        <>
            <div className="bg-gray-50 flex h-8 flex-row w-full justify-between gap-2 items-center border-b border-gray-200 pr-4 py-2">
                {props.showRunButton && (
                    <button
                        onClick={props.onRun}
                        disabled={props.onRun == undefined}
                        className="hover:text-gray-800 text-gray-600"
                    >
                        {getRunButtonContent(props)}
                    </button>
                )}
                {props.showCopyButton && (
                    <CopyButton textToCopy={props.copyCode} size={18}/>
                )}
            </div>
        </>
    );
}


