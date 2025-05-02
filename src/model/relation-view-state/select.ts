import {TableViewState} from "@/model/relation-view-state/table";
import {RelationData} from "@/model/relation";


export interface SelectViewState {
    placeholder?: string;
}

export function getInitialSelectViewState(relationData: RelationData): SelectViewState {
    return getInitialSelectViewStateEmpty()
}

export function getInitialSelectViewStateEmpty(): SelectViewState {
    return {
    };
}

