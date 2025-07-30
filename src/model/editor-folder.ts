import {TreeNode} from "@/components/basics/files/tree-utils";
import {getRandomId} from "@/platform/id-utils";
import {RelationZustandEntityType} from "@/state/relations/entity-functions";


export interface EditorFolder extends TreeNode<EditorFolder, string> {

}



export function GetNewEditorFolder(name?: string): EditorFolder {

    const name_ = name ? name : "New Folder";

    return {
        id: getRandomId(),
        name: name_,
        type: 'folder',
        children: []
    }
}

export function GetNewEditorEntity(id: string, type: RelationZustandEntityType, name: string): EditorFolder {

    return {
        id: id,
        name: name,
        type: type,
        children: null
    }
}