import {RelationBlockData} from "@/components/editor/tools/relation.tool";


export function isRelationBlockData(data: any): data is RelationBlockData {
    return data && typeof data === 'object' && 'viewState' in data;
}
