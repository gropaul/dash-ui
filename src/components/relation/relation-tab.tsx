import {useRelationsState} from "@/state/relations.state";
import {shallow} from "zustand/shallow";
import {RelationView} from "@/components/relation/relation-view";

export interface RelationTabProps {
    relationId: string;
}

export function RelationTab(props: RelationTabProps) {

    const relationId = props.relationId;

    const updateRelation = useRelationsState((state) => state.updateRelation);

    const relationsState = useRelationsState((state) => state.relations[relationId], shallow);
    console.log("Rendering RelationTab for relation ", relationId, relationsState);

    if (!relationsState) {
        return <div>Data View not found: {props.relationId}</div>
    }


    return <RelationView
        relationState={relationsState}
        updateRelation={updateRelation}
    />;
}