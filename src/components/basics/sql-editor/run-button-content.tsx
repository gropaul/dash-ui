import {Loader2, Play} from "lucide-react";
import React from "react";
import {CodeFenceButtonProps} from "@/components/basics/sql-editor/editor-button-panel";


export const getRunButtonContent = (props: CodeFenceButtonProps) => {
    switch (props.executionState.state) {
        case "running":
            return (
                <div className="flex flex-row items-center h-6">
                    <div className={"w-[62px] flex flex-row items-center gap-2 justify-center"}>
                        <Loader2 size={18} className="animate-spin"/>
                    </div>
                    <span className="text-sm">{props.runText}</span>
                </div>
            );
        default:
            return (
                <div className="flex flex-row items-center h-6">
                    <div className={"w-[62px] flex flex-row items-center gap-2 justify-center text-green-600 hover:text-green-800"}>
                        <Play size={18}/>
                    </div>
                    <span className="text-sm">{props.runText}</span>
                </div>
            );
    }
};
