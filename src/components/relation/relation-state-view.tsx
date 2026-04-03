import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import React, {RefObject, useEffect, useState} from "react";
import {LOADING_TIMER_OFFSET_MS} from "@/platform/global-data";
import {RelationStateContainer} from "@/components/relation/relation-state-container";
import {RelationLoadingView} from "@/components/relation/relation-loading-view";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";

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

    return (
        <>
            <RelationStateContainer {...inputProps} codeFenceRef={inputProps.codeFenceRef}/>
            {isLoading && <RelationLoadingView cancelQuery={props.cancelQuery}/>}
        </>
    );
}
