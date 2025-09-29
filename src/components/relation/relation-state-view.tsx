import {WindowSplitter} from "@/components/ui/window-splitter";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {ContentWrapper, RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";
import {Sizable} from "@/components/ui/sizable";
import {createAdvancedRelationActions} from "@/state/relations/functions";

export function RelationStateView(inputProps: RelationViewAPIProps) {

    const advancedActions = createAdvancedRelationActions(inputProps)
    const props: RelationViewProps = {
        ...inputProps,
        ...advancedActions,
    }

    const executionState = props.relationState.executionState;
    const codeFenceState = props.relationState.viewState.codeFenceState;

    const relationId = props.relationState.id;
    const [isLoading, setIsLoading] = useState(false);
    const [codeHeight, setCodeHeight] = useState(64*3);

    useEffect(() => {
        let timer: number | undefined;

        if (executionState.state === "running") {
            timer = setTimeout(() => setIsLoading(true), LOADING_TIMER_OFFSET) as unknown as number;
        } else {
            setIsLoading(false);
        }

        return () => clearTimeout(timer);
    }, [executionState.state]);


    function setCodeFenceState(relationId: string, sizePercentage: number) {
        props.updateRelationViewState( {
            codeFenceState: {
                ...codeFenceState,
                sizePercentage: sizePercentage,
            }
        });
    }
    const codePercentage = codeFenceState.show ? codeFenceState.sizePercentage * 100 : 0;
    const showQuery = codeFenceState.show;
    const embedded = props.embedded ?? false;

    return (
        <>
            {!embedded && (
                <WindowSplitter
                    child1Active={showQuery}
                    child2Active={true}
                    ratio={codePercentage / 100}
                    onChange={(ratio) => setCodeFenceState(relationId, ratio)}
                    layout={codeFenceState.layout}
                >
                    <RelationViewQueryView {...props} embedded={props.embedded}/>
                    <ContentWrapper {...props}/>
                </WindowSplitter>
            )}
            {
                embedded && (
                    <div className={"w-full h-fit bg-inherit flex flex-col"}>
                        {showQuery && <Sizable
                            width={'full'}
                            height={codeHeight}
                            onHeightChange={setCodeHeight}
                            allowResizeY
                            allowResizeX
                            resizableElements={['barBottom']}
                        >
                            <RelationViewQueryView {...props} embedded={props.embedded} inputManager={props.inputManager}/>
                        </Sizable>}
                        <ContentWrapper {...props}/>
                    </div>
                )
            }
            {isLoading && (
                <div
                    className="absolute top-0 left-0 w-full h-full z-50 flex items-center justify-center bg-background transition-opacity duration-200"
                    style={{
                        opacity: 0.8,
                    }}
                >
                    Loading...
                </div>
            )}
        </>
    );
}
