import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {RelationState} from "@/model/relation-state";
import {JsonViewer} from "@/components/ui/json-viewer";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {TriangleAlert} from "lucide-react";
import {DeepPartial} from "@/platform/utils";
import {RelationViewState} from "@/model/relation-view-state";
import {DefaultRelationZustandActions} from "@/state/relations.state";

export interface RelationViewProps extends DefaultRelationZustandActions{
    relationState: RelationState;
}

export function RelationView(props: RelationViewProps) {
    return (
        <div className="w-full h-full flex flex-col p-0 m-0 bg-background">
            <RelationViewHeader {...props}/>

            <div className={`flex-1 overflow-auto relative`}>
                <RelationStateView {...props}/>
            </div>
        </div>
    );
}

export interface ContentWrapperProps {
    relationState: RelationState
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,
}

export function ContentWrapper(props: ContentWrapperProps) {

    const queryState = props.relationState.executionState;
    return (
        queryState.state === "error" ? (
            <RelationViewError error={queryState.error}/>
        ) : (
            <RelationViewContent
                relationState={props.relationState}
                updateRelationViewState={props.updateRelationViewState}
            />
        )
    );
}

export function RelationViewError({error}: { error: Record<string, any> }) {
    return (
        <div className="p-4 w-full h-full flex flex-col items-start justify-start">
            <div className={'flex flex-row text-red-500 items-center space-x-2 h-6'}>
                <TriangleAlert size={16}/>
                <span>Error executing query</span>
            </div>
            <JsonViewer className="w-full text-red-500" json={error}/>
        </div>
    );
}
