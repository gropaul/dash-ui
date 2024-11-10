import {Table} from "@/components/relation/table/table";
import {RelationState} from "@/model/relation-state";
import {RelationViewState} from "@/components/relation/relation-view";


export interface RelationViewContentProps {
    relation: RelationState;
    viewState: RelationViewState;
    setViewState: (state: RelationViewState) => void;
}

export function RelationViewContent({relation, viewState, setViewState}: RelationViewContentProps) {
    if (viewState.selectedView === 'table') {
        return (
            <Table
                relation={relation}
                viewState={viewState}
                setViewState={setViewState}
            />
        );
    }
}