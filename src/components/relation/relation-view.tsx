import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {RelationViewState} from "@/model/relation-view-state";
import {shallow} from "zustand/shallow";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {

    const relation = useRelationsState((state) => state.doesRelationExist(props.relationId), shallow);
    if (!relation) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center">
                <div className="text-gray-500">Relation {props.relationId} not found</div>
            </div>
        )
    }
    return (
        <div className="flex flex-col w-full h-full">
            <RelationViewHeader relationId={props.relationId}/>
            <div className="relative overflow-y-auto flex-1">
                <RelationViewContent relationId={props.relationId}/>
            </div>
        </div>
    );
}
