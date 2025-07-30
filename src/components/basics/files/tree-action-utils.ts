import {TreeAction, TreeActionAdd, TreeActionUpdate, TreeNode} from "@/components/basics/files/tree-utils";
import {GetNewEditorEntity, GetNewEditorFolder} from "@/model/editor-folder";
import {RelationZustandEntityType} from "@/state/relations/entity-functions";

export function AddFolderActions(path: string[], parent?: TreeNode, name?: string): TreeAction[] {
    return AddNodeActions(path, GetNewEditorFolder(name), parent);
}

export function AddEntityActions(path: string[], id: string, type: RelationZustandEntityType, name: string, parent?: TreeNode): TreeAction[] {
   return AddNodeActions(path, GetNewEditorEntity(id, type, name), parent);
}

export function AddNodeActions(path: string[], new_node: TreeNode, parent?: TreeNode): TreeAction[] {
    const actions = []
    if (parent){
        const openAction: TreeActionUpdate = {
            type: 'update',
            id_path: path,
            node: {...parent, expanded: true}
        }
        actions.push(openAction);
    }
    const addAction: TreeActionAdd = {
        type: 'add',
        id_path: path,
        node: new_node
    }
    actions.push(addAction);
    return actions;
}

export function RenameNodeActions(path: string[], name: string, oldNode: TreeNode): TreeAction[] {
    const updateAction: TreeActionUpdate = {
        type: 'update',
        id_path: path,
        node: {...oldNode, name: name}
    }
    return [updateAction];
}

export function RemoveNodeAction(path: string[]): TreeAction[] {
    const removeAction: TreeAction = {
        type: 'remove',
        id_path: path
    }
    return [removeAction];
}