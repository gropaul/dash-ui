import {RelationData} from "@/model/relation";
import {getRandomId} from "@/platform/id-utils";


export interface SelectViewState {
    name: string;
    value?: string;
    placeholder?: string;
    showConfig?: boolean;
}

export function getInitialSelectViewState(relationData: RelationData): SelectViewState {
    return getInitialSelectViewStateEmpty()
}

export function getInitialSelectViewStateEmpty(): SelectViewState {
    return {
        name: "Select_" + getRandomId(8)
    };
}
