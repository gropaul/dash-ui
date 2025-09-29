import {RelationStateView} from "@/components/relation/relation-state-view";
import {RelationState} from "@/model/relation-state";

import {InputManager} from "@/components/editor/inputs/input-manager";

export interface DashboardDataViewProps {
    relation: RelationState;
    inputManager: InputManager;
    onRelationUpdate: (relation: RelationState) => void;
}


export function DashboardDataView(props: DashboardDataViewProps) {


    return <RelationStateView
        embedded
        relationState={props.relation}
        inputManager={props.inputManager}
        updateRelation={props.onRelationUpdate}
    />
}