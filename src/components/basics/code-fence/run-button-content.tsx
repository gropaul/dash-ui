import {Loader2, Play} from "lucide-react";
import React from "react";
import {CodeFenceButtonProps} from "@/components/basics/code-fence/code-fence-button-panel";


export const getRunButtonContent = (props: CodeFenceButtonProps) => {
    switch (props.executionState.state) {
        case "running":
            return (
                <div  className="flex flex-row items-center gap-2 h-6">
                    <Loader2 size={18} className="animate-spin"/>
                    <span>{props.runText}</span>
                </div>
            );
        default:
            return (
                <div  className="flex flex-row items-center gap-2 h-6">
                    <Play size={18}/>
                    <span>{props.runText}</span>
                </div>
            );
    }
};
