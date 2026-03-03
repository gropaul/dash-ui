import {TaskExecutionState} from "@/model/relation-state";
import {Button} from "@/components/ui/button";
import {Loader2, Play, Square} from "lucide-react";
import {cn} from "@/lib/utils";

export interface RelationViewRunButtonProps {
    className?: string;
    runState: TaskExecutionState;
    onRun: () => void;
    onStopRun: () => void;
}

export function RelationViewRunButton({runState, onRun, onStopRun, className}: RelationViewRunButtonProps) {
    const isRunning = runState.state === 'running';

    if (isRunning) {
        return (
            <Button
                className={cn("rounded-[0px] w-10 h-10 relative p-0 overflow-visible", className)}
                variant="ghost"
                size="icon"
                onClick={onStopRun}
            >
                <div className="absolute h-full flex items-center justify-center w-full text-gray-300">
                    <Loader2 style={{height: 32, width: 32}} className="animate-spin"/>
                </div>
                <Square
                    className="w-4 h-4 text-red-500 relative z-10"
                    style={{fill: 'rgba(239,68,68,0.05)'}}
                />
            </Button>
        );
    }

    return (
        <Button
            className={cn("rounded-[0px] w-10 h-10", className)}
            variant="ghost"
            size="icon"
            onClick={onRun}
        >
            <Play
                strokeWidth={2.5}

                style={ {height: 19, width: 19, fill: 'rgba(22,163,74,0.05)'} }
                className="w-6 h-6 text-green-600 hover:text-green-800"
            />
        </Button>
    );
}