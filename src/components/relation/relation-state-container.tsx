import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {ContentWrapper, RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {RefObject, useState} from "react";
import {Sizable} from "@/components/ui/sizable";
import {cn} from "@/lib/utils";
import {getViewSizeRequirements} from "@/model/relation-view-state";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {ParameterPanel} from "@/components/relation/parameters/parameter-panel";
import {ParameterDefinition} from "@/model/relation-view-state/parameters";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";

export interface RelationStateContainerProps extends RelationViewAPIProps {
    codeFenceRef?: RefObject<HTMLDivElement | null>;
}

export function RelationStateContainer(inputProps: RelationStateContainerProps) {
    const advancedActions = getRelationActions(inputProps);
    const props: RelationViewProps = {
        ...inputProps,
        ...advancedActions,
    };

    const codeFenceState = props.getSessionState(props.mode).codeFenceState;
    const parametersState = props.relationState.viewState.parametersState ?? { panelState: { show: false, sizePercentage: 30 }, parameters: [] };
    const [codeHeight, setCodeHeight] = useState(64 * 3);

    function setCodeFenceState(sizePercentage: number) {
        // on collapse, don't propate the size as we want it to reuse it when we open again
        const codeFencePercentage = 100 - sizePercentage;
        if (codeFencePercentage < 10) {
            return;
        }
        advancedActions.updateSessionState(props.mode, {
            codeFenceState: {sizePercentage: codeFencePercentage},
        });
    }

    function handleUpdateParameters(parameters: ParameterDefinition[]) {
        props.updateRelationViewState({
            parametersState: {
                parameters,
            }
        });
    }

    const parameterPanelElement = (
        <ParameterPanel
            size={props.height === 'fit' ? 'small' : 'large'}
            parametersState={parametersState}
            onUpdateParameters={handleUpdateParameters}
        />
    );

    const codePercentage = codeFenceState.show ? codeFenceState.sizePercentage : 0;
    const showQuery = codeFenceState.show;
    const layout = codeFenceState.layout;

    if (props.height === 'fit' || props.height == null) {

        const sizeRequirement = getViewSizeRequirements(props.relationState.viewState.selectedView);

        switch (sizeRequirement) {
            case 'fit':
                // for fit views, we show the query above the content, the content should just take as much
                // as it needs and the query should take the remaining height if shown.
                return (
                    <div className={cn("w-full h-full bg-inherit flex flex-col", inputProps.className)}>
                        {parameterPanelElement}
                        {showQuery && (
                            <div className="flex-1 min-h-8">
                                <RelationViewQueryView
                                    statics={inputProps}
                                    ref={inputProps.codeFenceRef}
                                    {...props}
                                />
                            </div>
                        )}
                        <div className={cn("h-[1px] w-full bg-muted", !showQuery && 'hidden')}/>
                        <div className={cn("bg-inherit", showQuery ? "flex-shrink-0 min-h-24" : "flex-1")}>
                            <ContentWrapper {...props}/>
                        </div>
                    </div>
                );
            case 'full':
                return (
                    <div className="w-full h-full flex flex-col bg-inherit">
                        {parameterPanelElement}
                        <ResizablePanelGroup className={'bg-inherit flex-1'}
                                             direction={layout == 'row' ? 'vertical' : 'horizontal'}>
                            {showQuery && (
                                <>
                                    <ResizablePanel
                                        id="query"
                                        order={0}
                                        defaultSize={codePercentage}
                                        minSize={10}
                                    >
                                        <RelationViewQueryView
                                            statics={inputProps}
                                            ref={inputProps.codeFenceRef}
                                            {...props}
                                        />
                                    </ResizablePanel>
                                    <ResizableHandle/>
                                </>
                            )}
                            <ResizablePanel
                                id="content"
                                order={1}
                                className={'bg-inherit'}
                                defaultSize={showQuery ? 100 - codePercentage : 100}
                                onResize={setCodeFenceState}
                                minSize={10}
                            >
                                <ContentWrapper {...props}/>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </div>
                );
        }
    }

    if (props.height === 'resizable') {
        return (
            <div className={cn("w-full h-fit bg-inherit flex flex-col", inputProps.className)}>
                {parameterPanelElement}
                {showQuery && (
                    <Sizable
                        width={'full'}
                        height={codeHeight}
                        onHeightChange={setCodeHeight}
                        allowResizeY
                        allowResizeX
                        resizableElements={['barBottom']}
                    >
                        <RelationViewQueryView
                            statics={inputProps}
                            ref={inputProps.codeFenceRef}
                            {...props}
                        />
                    </Sizable>
                )}
                <ContentWrapper {...props}/>
            </div>
        );
    }

    return null;
}