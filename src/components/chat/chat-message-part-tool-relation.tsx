import React from "react";
import {RelationState} from "@/model/relation-state";
import {RelationStateView} from "@/components/relation/relation-state-view";


export interface ChatTablePartProps {
    initialState: RelationState;
}


export function RelationPart(props: ChatTablePartProps) {

    const [relationState, setRelationState] = React.useState<RelationState>(props.initialState);
    try {
        return (
            <div className={"w-full h-full flex flex-col p-0 m-0 bg-background "}>
                <RelationStateView
                    // className={"border-primary border rounded-md"}
                    relationState={relationState}
                    updateRelation={setRelationState}
                    embedded={true}
                />
            </div>
        );
    } catch (e) {
        return <div className={"text-red-500"}>Error rendering view: {(e as Error).message}</div>
    }
}

