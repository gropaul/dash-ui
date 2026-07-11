import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {RefObject, useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET_MS} from "@/platform/global-data";
import {RelationStateContainer} from "@/components/relation/relation-state-container";
import {RelationLoadingView} from "@/components/relation/relation-loading-view";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {DefaultErrorBoundary} from "@/components/basics/error-bundary";
import {hasSettingsPanel, RelationViewConfig} from "@/components/relation/relation-view-config";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {ViewPadding} from "@/components/ui/view-padding";
import {cn} from "@/lib/utils";
import {useGUIState} from "@/state/gui.state";

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
    const configSplitRatio = useGUIState(state => state.configSplitRatio);
    const setConfigSplitRatio = useGUIState(state => state.setConfigSplitRatio);
    const configSize = Math.round(configSplitRatio * 100);

    function onConfigResize(size: number) {
        setConfigSplitRatio(size / 100);
    }

    return (
        <DefaultErrorBoundary>
            {showConfig ? (
                <ResizablePanelGroup direction="horizontal" className="w-full h-full bg-inherit">
                    <ResizablePanel defaultSize={100 - configSize} minSize={30} className={'bg-inherit'}>
                        <ViewPadding active={props.showHeader} addPaddingBottom className={'h-full w-full'}>
                            <div className={'flex flex-col w-full h-full'}>
                                {props.showHeader && <RelationViewHeader {...inputProps}/>}
                                <div className={cn("rounded-2xl flex-1 min-h-0 w-full bg-card", inputProps.showBorder && 'border')}>
                                    <RelationStateContainer {...inputProps} codeFenceRef={inputProps.codeFenceRef}/>
                                </div>
                            </div>
                        </ViewPadding>
                    </ResizablePanel>
                    <ResizableHandle/>
                    <ResizablePanel defaultSize={configSize} onResize={onConfigResize} minSize={15}>
                        <div className="pr-1 w-full h-full overflow-y-auto">
                            <RelationViewConfig {...props}/>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                <ViewPadding active={props.showHeader} addPaddingBottom className={'h-full w-full'}>
                    <div className={'flex flex-col w-full h-full'}>
                        {props.showHeader && <RelationViewHeader {...inputProps}/>}
                        <div className={cn("rounded-2xl flex-1 min-h-0 w-full bg-card", inputProps.showBorder && 'border')}>
                            <RelationStateContainer {...inputProps} codeFenceRef={inputProps.codeFenceRef}/>
                        </div>
                    </div>
                </ViewPadding>
            )}
            {isLoading && <RelationLoadingView cancelQuery={props.cancelQuery}/>}
        </DefaultErrorBoundary>
    );
}
