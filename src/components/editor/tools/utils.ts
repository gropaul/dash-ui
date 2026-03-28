import {RelationState} from "@/model/relation-state";

export function isRelationState(data: any): data is RelationState {
    return data && typeof data === 'object' && 'viewState' in data;
}
