import {TreeAction, TreeActionAdd, TreeActionUpdate, TreeNode} from "@/components/basics/files/tree-utils";
import {GetNewEditorDashboard, GetNewEditorFolder, GetNewEditorRelation} from "@/model/editor-folder";

export function AddFolderActions(path: string[], parent?: TreeNode, name?: string): TreeAction[] {
    return AddNodeActions(path, '', GetNewEditorFolder(name), parent);
}

export function AddRelationActions(path: string[], id: string, parent?: TreeNode, name?: string): TreeAction[] {
   return AddNodeActions(path, id, GetNewEditorRelation(id, name), parent);
}

export function AddDashboardActions(path: string[], id: string, parent?: TreeNode, name?: string): TreeAction[] {
    return AddNodeActions(path, '', GetNewEditorDashboard(id, name), parent);
}

export function AddNodeActions(path: string[], id: string, new_node: TreeNode, parent?: TreeNode): TreeAction[] {
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