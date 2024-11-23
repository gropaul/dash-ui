import {Check, Copy, Play, Loader2, XCircle} from "lucide-react";
import React from "react";
import {TaskExecutionState} from "@/model/relation-state";

interface CodeFenceOverlayProps {
    showCopyButton: boolean;
    copyCode: string;

    showRunButton?: boolean;
    onRun?: () => void;
    runState?: TaskExecutionState;
}

export function CodeFenceOverlay(props: CodeFenceOverlayProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        await navigator.clipboard.writeText(props.copyCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const getRunButtonContent = () => {
        switch (props.runState) {
            case 'running':
                return <Loader2 size={18} className="animate-spin"/>;
            case 'success':
                return <Check size={18} className="text-green-500"/>;
            case 'error':
                return <XCircle size={18} className="text-red-500"/>;
            default:
                return <Play size={18}/>;
        }
    };

    return (
        <div>
            {props.showCopyButton && (
                <button
                    onClick={handleCopy}
                    className="absolute top-4 right-4"
                >
                    {copied ?
                        <Check
                            className={"cursor-pointer hover:text-gray-800 text-gray-500"}
                            size={18}
                        />
                        :
                        <Copy
                            className={"cursor-pointer hover:text-gray-800 text-gray-500"}
                            size={18}
                        />
                    }
                </button>
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
