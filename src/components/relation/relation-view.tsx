import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {shallow} from "zustand/shallow";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";
import {TriangleAlert} from "lucide-react";
import {TaskExecutionState} from "@/model/relation-state";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {
    const relationExists = useRelationsState(
        (state) => state.doesRelationExist(props.relationId),
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

    const relationId = props.relationId;
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (queryState.state === "running") {
            timer = setTimeout(() => {
                setIsLoading(true);
            }, LOADING_TIMER_OFFSET);
        } else {
            setIsLoading(false);
            if (timer) {
                clearTimeout(timer);
            }
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
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

    const hasError = queryState.state === "error";

    const flexDirection = codeFenceState.layout === "row" ? "flex-col" : "flex-row";
    const codePercentage = codeFenceState.show ? codeFenceState.sizePercentage * 100 : 0;


    // Dynamic styles based on codePercentage
    const codeFenceStyle = {
        flex: `${codePercentage} 1 0%`, // Proportional flex for this section
    };

    const contentStyle = {
        flex: `${100 - codePercentage} 1 0%`, // Remaining proportional flex
    };

    return (
        <div className="w-full h-full flex flex-col p-0 m-0">
            {/* Header */}
            <RelationViewHeader relationId={relationId}/>

            {/* Content */}
            <div className={`flex-1 overflow-auto`}>
                {/* Main content */}
                <div className={`w-full h-full flex ${flexDirection}`}>
                    {/* Query View Section */}
                    <div
                        className="overflow-auto" // Allow scrolling within this section
                        style={codeFenceStyle} // Adjust width/height dynamically
                    >
                        <RelationViewQueryView relationId={relationId}/>
                    </div>

                    {/* Content Section */}
                    <div
                        className="relative overflow-hidden" // Allow scrolling within this section
                        style={contentStyle} // Adjust width/height dynamically
                    >
                        <ContentWrapper
                            hasError={hasError}
                            isLoading={isLoading}
                            relationId={relationId}
                            queryState={queryState}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

export interface ContentWrapperProps {
    hasError: boolean;
    isLoading: boolean;
    relationId: string;
    queryState: TaskExecutionState;
}


export function ContentWrapper(props: ContentWrapperProps) {
    return (
        <>
            {/* Error or Content */}
            {props.hasError ? (
                <RelationViewError message={props.queryState.message}/>
            ) : (
                <RelationViewContent relationId={props.relationId}/>
            )}

            {/* Loading Overlay */}
            {props.isLoading && (
                <div
                    className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-70 z-10 flex items-center justify-center transition-opacity duration-200"
                >
                    Loading...
                </div>
            )}
        </>
    )

}

export function RelationViewError(props: { message?: string }) {
    return (
        <div className="flex flex-col items-start justify-center p-4">
            <div className="text-red-500 flex items-center gap-2">
                <TriangleAlert size={18}/> {props.message || "An error occurred"}
            </div>
        </div>
    );
}

//
//
