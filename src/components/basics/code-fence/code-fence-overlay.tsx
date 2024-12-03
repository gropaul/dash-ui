import {Check, Loader2, Play, XCircle} from "lucide-react";
import React from "react";
import { TaskExecutionState } from "@/model/relation-state";
import {CopyButton} from "@/components/basics/input/copy-button";

interface CodeFenceOverlayProps {
    showCopyButton: boolean;
    copyCode: string;

    showRunButton?: boolean;
    onRun?: () => void;
    runState?: TaskExecutionState;
}

export function CodeFenceOverlay(props: CodeFenceOverlayProps) {
    const getRunButtonContent = () => {
        switch (props.runState) {
            case "running":
                return <Loader2 size={18} className="animate-spin" />;
            case "success":
                return <Check size={18} className="text-green-500" />;
            case "error":
                return <XCircle size={18} className="text-red-500" />;
            default:
                return <Play size={18} />;
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
                    className="absolute top-4 right-14 flex items-center gap-1 p-1 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    {getRunButtonContent()}
                </button>
            )}
        </div>
    );
}
