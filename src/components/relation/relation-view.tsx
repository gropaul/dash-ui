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
import {RelationStateView} from "@/components/relation/relation-state-view";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {

    const relationId = props.relationId;

    const relationsState = useRelationsState((state) => state.getRelation(relationId), shallow);

    return (
        <div className="w-full h-full flex flex-col p-0 m-0 bg-background">
            {/* Header */}
            <RelationViewHeader relationId={relationId}/>

            {/* Content */}
            <div className={`flex-1 overflow-auto relative`}>
                <RelationStateView relationState={relationsState} />
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
