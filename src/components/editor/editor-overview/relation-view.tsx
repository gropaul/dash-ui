import {RelationState} from "@/model/relation-state";
import {Eye, EyeOff, Sheet} from "lucide-react";
import React from "react";
import {useRelationsState} from "@/state/relations.state";


interface RelationViewProps{
    relation: RelationState;
}

export function RelationView(props: RelationViewProps){

    const isOpen = props.relation.viewState.isTabOpen;

    const showRelation = useRelationsState((state) => state.showRelation);

    return <div className={"p-2 pt-0 flex items-center"}
        onClick={() => showRelation(props.relation)}
    >
        <div
            className="flex-shrink-0 flex items-center"
            style={{width: '1.5rem'}}
        >
            <Sheet size={16}/>
        </div>
        <span>
            {props.relation.name}
        </span>

        <div className={"px-2 ml-auto text-muted-foreground"}>
            {isOpen ? <Eye size={12}/> : <EyeOff size={12}/>}
        </div>
    </div>
}