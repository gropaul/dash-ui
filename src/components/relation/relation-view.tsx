import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {RelationViewState} from "@/model/relation-view-state";
import {shallow} from "zustand/shallow";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {

    const relationExists = useRelationsState((state) => state.doesRelationExist(props.relationId), shallow);
    if (!relationExists) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center">
                <div className="text-gray-500">Relation {props.relationId} not found</div>
            </div>
        )
    }
    return (
        <div className="flex flex-col w-full h-full">
            <RelationViewHeader relationId={props.relationId}/>
            <RelationViewQueryView relationId={props.relationId}/>
            <div className="relative overflow-y-auto flex-1">
                <RelationViewContent relationId={props.relationId}/>
            </div>
        </div>
    );
}
