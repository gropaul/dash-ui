
import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {RelationViewState} from "@/model/relation-view-state";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {

    const relation = useRelationsState((state) => state.getRelation(props.relationId));

    const setRelationViewStateExternal = useRelationsState((state) => state.setRelationViewState);

    function setRelationViewState(viewState: RelationViewState) {
        setRelationViewStateExternal(props.relationId, viewState);
    }

    if (!relation) {
        return <div>Relation not found: {props.relationId}</div>;
    }

    return (
        <div className="flex flex-col w-full h-full">
            <RelationViewHeader relationState={relation} setRelationViewState={setRelationViewState}/>
            <div className="relative overflow-y-auto flex-1">
                <RelationViewContent relation={relation} setRelationViewState={setRelationViewState}/>
            </div>
        </div>
    );
}
