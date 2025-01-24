import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {RelationState} from "@/model/relation-state";
import {JsonViewer} from "@/components/ui/json-viewer";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {TriangleAlert} from "lucide-react";
import {DefaultRelationZustandActions} from "@/state/relations.state";

export interface RelationViewProps extends DefaultRelationZustandActions{
    relationState: RelationState;
    embedded?: boolean;
}

export function RelationView(props: RelationViewProps) {
    return (
        <div className="w-full h-full flex flex-col p-0 m-0 bg-background">
            <RelationViewHeader {...props}/>

            <div className={`flex-1 bg-background overflow-auto`}>
                <RelationStateView {...props}/>
            </div>
        </div>
    );
}


export function ContentWrapper(props: RelationViewProps) {

    const queryState = props.relationState.executionState;
    return (
        queryState.state === "error" ? (
            <RelationViewError error={queryState.error}/>
        ) : (
            <RelationViewContent {...props}/>
        )
    );
}

export function RelationViewError({error}: { error: Record<string, any> }) {
    return (
        <div className="p-4 w-full bg-inherit h-full flex flex-col items-start justify-start">
            <div className={'flex bg-inherit flex-row text-red-500 items-center space-x-2 h-6'}>
                <TriangleAlert size={16}/>
                <span>Error executing query</span>
            </div>
            <JsonViewer className="w-full text-red-500" json={error}/>
        </div>
    );
}
