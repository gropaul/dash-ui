import {RelationState} from "@/model/relation-state";
import {Sheet} from "lucide-react";
import React from "react";


interface RelationViewProps{
    relation: RelationState;
}

export function RelationView(props: RelationViewProps){
    return <div className={"p-2 pt-0 flex items-center"}>
        <div
            className="flex-shrink-0 flex items-center"
            style={{width: '1.5rem'}}
        >
            <Sheet size={16}/>
        </div>
        <span>
            {props.relation.name}
        </span>
    </div>
}