import {TreeNode} from "@/components/basics/files/tree-utils";
import {getRandomId} from "@/platform/id-utils";


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

export function GetNewEditorRelation(id: string, name?: string): EditorFolder {

    const name_ = name ? name : "New Relation";

    return {
        id: id,
        name: name_,
        type: 'relation',
        children: null
    }
}

export function GetNewEditorDashboard(id: string, name?: string): EditorFolder {

        const name_ = name ? name : "New Dashboard";

        return {
            id: id,
            name: name_,
            type: 'dashboard',
            children: null
        }
}