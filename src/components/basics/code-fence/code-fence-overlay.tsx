import {Check, Loader2, Play, XCircle} from "lucide-react";
import React from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {CopyButton} from "@/components/basics/input/copy-button";

interface CodeFenceOverlayProps {
    showCopyButton: boolean;
    copyCode: string;

    showRunButton?: boolean;
    onRun?: () => void;
    executionState?: TaskExecutionState;
}

export function CodeFenceOverlay(props: CodeFenceOverlayProps) {
    const getRunButtonContent = () => {
        switch (props.executionState) {
            case "running":
                return <Loader2 size={18} className="animate-spin" />;
            default:
                return (
                    <div className="flex flex-row gap-1 content-center justify-center">
                        <Play size={18} />
                        <div style={{ marginTop: "-0.125rem" }}>Run</div>
                    </div>
                );
        }
    };


    return (
        <div>
            {props.showCopyButton && (
                <div className="absolute top-4 right-4">
                    <CopyButton textToCopy={props.copyCode}  size={18} />
                </div>
            )}
            {props.showRunButton && (
                <button
                    onClick={props.onRun}
                    disabled={props.onRun == undefined}
                    className="absolute top-4 right-14 hover:text-gray-800 text-gray-500"
                >
                    {getRunButtonContent()}
                </button>
            )}
        </div>
    );
}
