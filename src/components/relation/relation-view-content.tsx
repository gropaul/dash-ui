import {Table} from "@/components/relation/table/table";
import {RelationState} from "@/model/relation-state";
import {RelationViewState} from "@/model/relation-view-state";


export interface RelationViewContentProps {
    relation: RelationState;
    setRelationViewState: (state: RelationViewState) => void;
}

export function RelationViewContent({relation, setRelationViewState}: RelationViewContentProps) {
    if (relation.viewState.selectedView === 'table') {
        return (
            <Table
                relationState={relation}
                setRelationViewState={setRelationViewState}
            />
        );
    }
}