import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {shallow} from "zustand/shallow";
import {TaskExecutionState} from "@/model/relation-state";
import {JsonViewer} from "@/components/ui/json-viewer";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {TriangleAlert} from "lucide-react";
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