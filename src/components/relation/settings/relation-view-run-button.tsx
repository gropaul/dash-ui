import {TaskExecutionState} from "@/model/relation-state";
import {Button} from "@/components/ui/button";
import {Loader2, Play, Square} from "lucide-react";

export interface RelationViewRunButtonProps {
    runState: TaskExecutionState;
    onRun: () => void;
    onStopRun: () => void;
}

export function RelationViewRunButton({runState, onRun, onStopRun}: RelationViewRunButtonProps) {
    const isRunning = runState.state === 'running';

    if (isRunning) {
        return (
            <Button
                className="rounded-[0px] w-10 h-10 relative p-0 overflow-visible"
                variant="ghost"
                size="icon"
                onClick={onStopRun}
            >
                <div className="absolute h-full flex items-center justify-center w-full text-gray-300">
                    <Loader2 style={{height: 32, width: 32}} className="animate-spin"/>
                </div>
                <Square className="w-4 h-4 text-red-500 relative z-10"/>
            </Button>
        );
    }

    return (
        <Button
            className="rounded-[0px] w-10 h-10"
            variant="ghost"
            size="icon"
            onClick={onRun}
        >
            <Play className="w-4 h-4 " />
        </Button>
    );
}