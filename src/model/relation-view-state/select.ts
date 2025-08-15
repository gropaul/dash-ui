import {RelationData} from "@/model/relation";
import {getRandomId} from "@/platform/id-utils";

export type InputType = 'fulltext' | 'select'

export interface InputTextViewState {
    name: string;
    inputType: InputType;
    value?: string;
    placeholder?: string;
    showConfig?: boolean;
}

export function getInitialSelectViewState(relationData: RelationData): InputTextViewState {
    return getInitialSelectViewStateEmpty()
}

export function getInitialSelectViewStateEmpty(): InputTextViewState {
    return {
        inputType: 'select',
        name: "Select_" + getRandomId(8)
    };
}
