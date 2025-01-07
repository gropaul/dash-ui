import {RelationState} from "@/model/relation-state";


interface RelationViewProps{
    relation: RelationState;
}

export function RelationView(props: RelationViewProps){
    return <div className={"p-2"}>
        {props.relation.name}
    </div>
}