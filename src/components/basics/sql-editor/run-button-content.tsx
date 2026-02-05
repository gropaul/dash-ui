import {Loader2, Play} from "lucide-react";
import React from "react";
import {TaskExecutionState} from "@/model/relation-state";


export interface RunButtonContentProps {
    runText: string;
    executionState: TaskExecutionState;
    testMargin? : string;
}

export function RunButton(props: RunButtonContentProps) {

    const testMargin = props.testMargin ?? "w-[62px]";

    switch (props.executionState.state) {
        case "running":
            return (
                <div className="flex flex-row items-center h-6">
                    <div className={`${testMargin} flex flex-row items-center gap-2 justify-center`}>
                        <Loader2 size={18} className="animate-spin"/>
                    </div>
                    <span className="text-sm  whitespace-nowrap">{props.runText}</span>
                </div>
            );
        default:
            return (
                <div className="flex flex-row items-center h-6">
                    <div
                        className={`${testMargin} flex flex-row items-center gap-2 justify-center text-green-600 hover:text-green-800`}>
                        <Play size={18}/>
                    </div>
                    <span className="text-sm  whitespace-nowrap">{props.runText}</span>
                </div>
            );
    }
};
