import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {RefObject, useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET_MS} from "@/platform/global-data";
import {RelationStateContainer} from "@/components/relation/relation-state-container";
import {RelationLoadingView} from "@/components/relation/relation-loading-view";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {DefaultErrorBoundary} from "@/components/basics/error-bundary";
import {hasSettingsPanel, ViewSettingsPanel} from "@/components/relation/view-settings-panel";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";

export interface RelationStateViewProps extends RelationViewAPIProps {
    codeFenceRef?: RefObject<HTMLDivElement | null>;
}

export function RelationStateView(inputProps: RelationStateViewProps) {
    const advancedActions = getRelationActions(inputProps);
    const props: RelationViewProps = {
        ...inputProps,
        ...advancedActions,
    };

    const executionState = props.relationState.executionState;
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timer: number | undefined;

        if (executionState.state === "running") {
            timer = setTimeout(() => setIsLoading(true), LOADING_TIMER_OFFSET_MS) as unknown as number;
        } else {
            setIsLoading(false);
        }

        return () => clearTimeout(timer);
    }, [executionState.state]);

    const viewType = props.relationState.viewState.selectedView;
    const showConfig = props.mode === 'fullscreen' && hasSettingsPanel(viewType);
    const sessionState = props.getSessionState(props.mode);
    const configSize = Math.round(sessionState.configState.configSplitRatio * 100);

    function onConfigResize(size: number) {
        advancedActions.updateSessionState(props.mode, {configState: {configSplitRatio: size / 100}});
    }

    return (
        <DefaultErrorBoundary>
            {showConfig ? (
                <ResizablePanelGroup direction="horizontal" className="w-full h-full bg-inherit">
                    <ResizablePanel defaultSize={100 - configSize} minSize={30} className={'bg-inherit'}>
                        <RelationStateContainer {...inputProps} codeFenceRef={inputProps.codeFenceRef}/>
                    </ResizablePanel>
                    <ResizableHandle/>
                    <ResizablePanel defaultSize={configSize} onResize={onConfigResize} minSize={15}>
                        <div className="pl-3 pr-1 py-3 w-full h-full overflow-y-auto">
                            <ViewSettingsPanel {...props}/>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                <RelationStateContainer {...inputProps} codeFenceRef={inputProps.codeFenceRef}/>
            )}
            {isLoading && <RelationLoadingView cancelQuery={props.cancelQuery}/>}
        </DefaultErrorBoundary>
    );
}
