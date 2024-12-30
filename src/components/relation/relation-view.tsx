import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {shallow} from "zustand/shallow";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";
import {TaskExecutionState} from "@/model/relation-state";
import {WindowSplitter} from "@/components/ui/window-splitter";
import {JsonViewer} from "@/components/ui/json-viewer";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {
    const relationExists = useRelationsState(
        (state) => state.relationExists(props.relationId),
        shallow
    );

    const queryState = useRelationsState(
        (state) => state.getRelation(props.relationId).executionState,
        shallow
    );

    const codeFenceState = useRelationsState(
        (state) => state.getRelation(props.relationId).viewState.codeFenceState,
        shallow
    );

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationId = props.relationId;
    const [isLoading, setIsLoading] = useState(false);

    function setCodeFenceState(relationId: string, sizePercentage: number) {
        updateRelationViewState(relationId, {
            codeFenceState: {
                ...codeFenceState,
                sizePercentage: sizePercentage,
            }
        });
    }

    useEffect(() => {
        let timer: number | undefined;

        if (queryState.state === "running") {
            timer = setTimeout(() => setIsLoading(true), LOADING_TIMER_OFFSET) as unknown as number;
        } else {
            setIsLoading(false);
        }

        return () => clearTimeout(timer);
    }, [queryState]);

    if (!relationExists) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center">
                <div className="text-gray-500">
                    Relation {props.relationId} not found
                </div>
            </div>
        );
    }

    const codePercentage = codeFenceState.show ? codeFenceState.sizePercentage * 100 : 0;
    const showCode = codeFenceState.show;

    return (
        <div className="w-full h-full flex flex-col p-0 m-0 bg-background">
            {/* Header */}
            <RelationViewHeader relationId={relationId}/>

            {/* Content */}
            <div className={`flex-1 overflow-auto relative`}>
                <WindowSplitter
                    child1Active={showCode}
                    child2Active={true}
                    ratio={codePercentage / 100}
                    onChange={(ratio) => setCodeFenceState(relationId, ratio)}
                    layout={codeFenceState.layout}
                >
                    <RelationViewQueryView relationId={relationId}/>
                    <ContentWrapper
                        isLoading={isLoading}
                        relationId={relationId}
                        queryState={queryState}
                    />
                </WindowSplitter>
                {isLoading && (
                    <div
                        className="absolute top-0 left-0 w-full h-full bg-background z-50 flex items-center justify-center transition-opacity duration-200"
                        style={{
                            opacity: 0.7,
                        }}
                    >
                        Loading...
                    </div>
                )}
            </div>
        </div>
    );
}

export interface ContentWrapperProps {
    isLoading: boolean;
    relationId: string;
    queryState: TaskExecutionState;
}

export function ContentWrapper(props: ContentWrapperProps) {
    return (
        props.queryState.state === "error" ? (
            <RelationViewError error={props.queryState.error}/>
        ) : (
            <RelationViewContent relationId={props.relationId}/>
        )
    );
}

export function RelationViewError({error}: { error: Record<string, any> }) {
    return (
        <JsonViewer className="w-full text-red-500 m-2" json={error}/>
    );
}
