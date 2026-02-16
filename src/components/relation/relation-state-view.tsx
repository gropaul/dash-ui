import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {RefObject, useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET_MS} from "@/platform/global-data";
import {createAdvancedRelationActions} from "@/state/relations/functions";
import {ConnectionsService} from "@/state/connections/connections-service";
import {Button} from "@/components/ui/button";
import {Loader2, Pause} from "lucide-react";
import {RelationState} from "@/model/relation-state";
import {RelationStateContainer} from "@/components/relation/relation-state-container";

export interface RelationStateViewProps extends RelationViewAPIProps {
    codeFenceRef?: RefObject<HTMLDivElement>;
}

export function RelationStateView(inputProps: RelationStateViewProps) {
    const advancedActions = createAdvancedRelationActions(inputProps);
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
                };
                props.updateRelation(copy);
            }
            await ConnectionsService.getInstance().abortQuery();
        } catch (e) {
        }
    }

    return (
        <>
            <RelationStateContainer {...inputProps} codeFenceRef={inputProps.codeFenceRef} />
            {isLoading && (
                <div
                    className="absolute top-0 left-0 w-full h-full z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-200"
                    style={{
                        opacity: 0.8,
                    }}
                >
                    <div className="flex items-center space-x-3 text-lg font-medium text-foreground">
                        <Loader2 className="h-6 w-6 animate-spin"/>
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
