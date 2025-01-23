import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {RelationView} from "@/components/relation/relation-view";

export interface RelationTabProps {
    relationId: string;
}

export function RelationTab(props: RelationTabProps) {

    const relationId = props.relationId;

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);
    const relationsState = useRelationsState((state) => state.getRelation(relationId), shallow);
    const updateRelationBaseQuery = useRelationsState((state) => state.updateRelationBaseQuery);
    const updateRelationDataWithParams = useRelationsState((state) => state.updateRelationDataWithParams);
    return <RelationView
        relationState={relationsState}
        updateRelationViewState={updateRelationViewState}
        updateRelationBaseQuery={updateRelationBaseQuery}
        updateRelationDataWithParams={updateRelationDataWithParams}
    />;
}