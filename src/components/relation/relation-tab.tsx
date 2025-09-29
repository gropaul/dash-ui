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
    const updateRelationDataWithParams = useRelationsState((state) => state.updateRelationDataWithParams);
    const updateRelation = useRelationsState((state) => state.updateRelation);

    if (!relationsState) {
        return <div>Data View not found: {props.relationId}</div>
    }

    return <RelationView
        relationState={relationsState}
        updateRelationViewState={updateRelationViewState}
        updateRelationDataWithParams={updateRelationDataWithParams}
        updateRelation={updateRelation}
    />;
}