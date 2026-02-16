import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {ContentWrapper, RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {RefObject, useState} from "react";
import {Sizable} from "@/components/ui/sizable";
import {cn} from "@/lib/utils";
import {createAdvancedRelationActions} from "@/state/relations/functions";
import {getViewSizeRequirements} from "@/model/relation-view-state";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";

export interface RelationStateContainerProps extends RelationViewAPIProps {
    codeFenceRef?: RefObject<HTMLDivElement>;
}

export function RelationStateContainer(inputProps: RelationStateContainerProps) {
    const advancedActions = createAdvancedRelationActions(inputProps);
    const props: RelationViewProps = {
        ...inputProps,
        ...advancedActions,
    };

    const codeFenceState = props.relationState.viewState.codeFenceState;
    const [codeHeight, setCodeHeight] = useState(64 * 3);

    function setCodeFenceState(sizePercentage: number) {
        props.updateRelationViewState({
            codeFenceState: {
                ...codeFenceState,
                sizePercentage: 100 - sizePercentage,
            }
        });
    }

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
                        {showQuery && (
                            <div className="flex-1 min-h-8">
                                <RelationViewQueryView
                                    ref={inputProps.codeFenceRef}
                                    {...props}
                                    embedded={props.embedded}
                                    inputManager={props.inputManager}
                                />
                            </div>
                        )}
                        <div className={cn("h-[1px] w-full bg-muted", !showQuery && 'hidden')}/>
                        <div className="bg-inherit flex-shrink-0">
                            <ContentWrapper {...props}/>
                        </div>
                    </div>
                );
            case 'full':
                return (
                    <ResizablePanelGroup className={'bg-inherit'} direction={layout == 'row' ? 'vertical' : 'horizontal'}>
                        <ResizablePanel
                            className={cn(showQuery ? 'block' : 'hidden')}
                            defaultSize={codePercentage}
                            minSize={20}
                        >
                            <RelationViewQueryView ref={inputProps.codeFenceRef} {...props} embedded={props.embedded}/>
                        </ResizablePanel>
                        <ResizableHandle
                            className={cn(showQuery ? 'block' : 'hidden')}
                        />
                        <ResizablePanel
                            className={'bg-inherit'}
                            defaultSize={100 - codePercentage}
                            minSize={showQuery ? 20 : 100}
                            onResize={setCodeFenceState}
                        >
                            <ContentWrapper {...props}/>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                );
        }
    }

    if (props.height === 'resizable') {
        return (
            <div className={cn("w-full h-fit bg-inherit flex flex-col", inputProps.className)}>
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
                            ref={inputProps.codeFenceRef}
                            {...props}
                            embedded={props.embedded}
                            inputManager={props.inputManager}
                        />
                    </Sizable>
                )}
                <ContentWrapper {...props}/>
            </div>
        );
    }

    return null;
}