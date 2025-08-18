import React from "react";
import {TaskExecutionState} from "@/model/relation-state";
import {CopyButton} from "@/components/basics/input/copy-button";
import {RunButton} from "@/components/basics/sql-editor/run-button-content";
import {Columns2, Rows2} from "lucide-react";
import {Layout} from "@/model/relation-view-state";
import {cn} from "@/lib/utils";

export interface CodeFenceButtonProps {
    embedded: boolean;
    showCopyButton: boolean;
    copyCode: string;

    showLayoutButton?: boolean;
    currentLayout?: Layout;
    onLayoutChange?: (layout: Layout) => void;

    showRunButton?: boolean;
    onRun?: () => void;

    runText: string;
    executionState: TaskExecutionState;
}

export function EditorButtonPanel(props: CodeFenceButtonProps) {

    const yPadding = props.embedded ? 'pb-2 pt-0.5' : 'py-2'

    return (
        <>
            <div className={cn("flex flex-row w-full gap-3 items-center border-b border-border pr-4", yPadding)}>
                {props.showRunButton && (
                    <button
                        onClick={props.onRun}
                        disabled={props.onRun == undefined}
                        className="hover:text-primary text-muted-foreground"
                    >
                        <RunButton {...props} />
                    </button>
                )}
                <div className="flex-1"/>
                {props.showLayoutButton && (
                    props.currentLayout == 'row' ? (
                        <button className="hover:text-primary text-muted-foreground"
                                onClick={() => props.onLayoutChange?.('column')}>
                            <Columns2 size={18}/>
                        </button>
                    ) : (
                        <button className="hover:text-primary text-muted-foreground"
                                onClick={() => props.onLayoutChange?.('row')}>
                            <Rows2 size={18}/>
                        </button>
                    )
                )}
                {props.showCopyButton && (
                    <CopyButton textToCopy={props.copyCode} size={17}/>
                )}
            </div>
        </>
    );
}
