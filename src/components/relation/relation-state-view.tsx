import {WindowSplitter} from "@/components/ui/window-splitter";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {ContentWrapper, RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET_MS} from "@/platform/global-data";
import {Sizable} from "@/components/ui/sizable";
import {createAdvancedRelationActions} from "@/state/relations/functions";
import {cn} from "@/lib/utils";
import {ConnectionsService} from "@/state/connections/connections-service";
import {Button} from "@/components/ui/button";
import {Loader2, Pause, Play, XCircle} from "lucide-react";
import {RelationState} from "@/model/relation-state";

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
            timer = setTimeout(() => setIsLoading(true), LOADING_TIMER_OFFSET_MS) as unknown as number;
        } else {
            setIsLoading(false);
        }

        return () => clearTimeout(timer);
    }, [executionState.state]);

    async function cancelQuery() {
        try {
            const relation = props.relationState;
            if (relation.executionState.state === "running") {
                const copy: RelationState = {
                    ...relation,
                    executionState: {
                        ...relation.executionState,
                        state: "error",
                        error: {message: "Error: Query aborted by user"}
                    }
                }
                props.updateRelation(copy);
            }
            await ConnectionsService.getInstance().abortQuery()
        } catch (e) {
        }
    }


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
                    <div className={cn("w-full h-fit bg-inherit flex flex-col", inputProps.className)}>
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
                    className="absolute top-0 left-0 w-full h-full z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-200"
                    style={{
                        opacity: 0.8,
                    }}
                >
                    <div className="flex items-center space-x-3 text-lg font-medium text-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading...</span>
                    </div>
                    <Button
                        className="mt-2 flex items-center"
                        variant="ghost"
                        size="icon"
                        onClick={cancelQuery}
                    >
                        <Pause size={24}/>
                    </Button>
                </div>
            )}
        </>
    );
}
