import {WindowSplitter} from "@/components/ui/window-splitter";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {ContentWrapper, RelationViewProps} from "@/components/relation/relation-view";
import {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";

export function RelationStateView(props: RelationViewProps) {

    const executionState = props.relationState.executionState;
    const codeFenceState = props.relationState.viewState.codeFenceState;

    const relationId = props.relationState.id;
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timer: number | undefined;

        if (executionState.state === "running") {
            timer = setTimeout(() => setIsLoading(true), LOADING_TIMER_OFFSET) as unknown as number;
        } else {
            setIsLoading(false);
        }

        return () => clearTimeout(timer);
    }, [executionState]);


    function setCodeFenceState(relationId: string, sizePercentage: number) {
        props.updateRelationViewState(relationId, {
            codeFenceState: {
                ...codeFenceState,
                sizePercentage: sizePercentage,
            }
        });
    }

    const codePercentage = codeFenceState.show ? codeFenceState.sizePercentage * 100 : 0;
    const showCode = codeFenceState.show;

    return (
        <>
            <WindowSplitter
                child1Active={showCode}
                child2Active={true}
                ratio={codePercentage / 100}
                onChange={(ratio) => setCodeFenceState(relationId, ratio)}
                layout={codeFenceState.layout}
            >
                <RelationViewQueryView {...props}/>
                <ContentWrapper {...props}/>
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
        </>
    )
}