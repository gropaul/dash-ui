import {WindowSplitter} from "@/components/ui/window-splitter";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {ContentWrapper, RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {useState} from "react";
import {Sizable} from "@/components/ui/sizable";
import {cn} from "@/lib/utils";
import {createAdvancedRelationActions} from "@/state/relations/functions";

export function RelationStateContainer(inputProps: RelationViewAPIProps) {
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
                sizePercentage: sizePercentage,
            }
        });
    }

    const codePercentage = codeFenceState.show ? codeFenceState.sizePercentage * 100 : 0;
    const showQuery = codeFenceState.show;
    const layout = codeFenceState.layout;

    if (props.height === 'fit' || props.height == null) {
        return (
            <WindowSplitter
                child1Active={showQuery}
                child2Active={true}
                ratio={codePercentage / 100}
                onChange={setCodeFenceState}
                layout={layout}
            >
                <RelationViewQueryView {...props} embedded={props.embedded}/>
                <ContentWrapper {...props}/>
            </WindowSplitter>
        );
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