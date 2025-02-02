import {TreeNode} from "@/components/basics/files/tree-utils";
import {
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger
} from "@/components/ui/context-menu";
import {Copy, Folder, LayoutDashboard, PencilLine, Plus, Sheet, Trash} from "lucide-react";
import React from "react";

export function ContextMenuFactory(
    path: string[],
    tree: TreeNode,
    onDelete: (path: string[], tree: TreeNode) => void,
    onRename: (path: string[], tree: TreeNode) => void,
    onDuplicate: (path: string[], tree: TreeNode) => void,
    onAddRelationToDashboard: (path: string[], tree: TreeNode) => void,
    onAddNewRelation: (path: string[], tree: TreeNode) => void,
    onAddNewDashboard: (path: string[], tree: TreeNode) => void,
    onAddNewFolder: (path: string[], tree: TreeNode) => void
) {
    return (
        <>
            {tree.type === 'folder' && (
                <>
                    <ContextMenuSub>
                        <ContextMenuSubTrigger>
                            <Plus size={16} className="mr-2"/>
                            <span>New ...</span>
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="max-w-64 truncate text-left">
                            <ContextMenuItem onClick={() => onAddNewFolder(path, tree)}>
                                <Folder size={16} className="mr-2"/>
                                <span>Folder</span>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => onAddNewRelation(path, tree)}>
                                <Sheet size={16} className="mr-2"/>
                                <span>Query</span>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => onAddNewDashboard(path, tree)}>
                                <LayoutDashboard size={16} className="mr-2"/>
                                <span>Dashboard</span>
                            </ContextMenuItem>
                        </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuSeparator/>
                </>
            )}
            <ContextMenuItem onClick={() => onRename(path, tree)}>
                <PencilLine size={16} className="mr-2"/>
                <span>Rename</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete(path, tree)}>
                <Trash size={16} className="mr-2"/>
                <span>Delete</span>
            </ContextMenuItem>
            {tree.type !== 'folder' && (
                <ContextMenuItem onClick={() => onDuplicate(path, tree)}>
                    <Copy size={16} className="mr-2"/>
                    <span>Duplicate</span>
                </ContextMenuItem>
            )}
            {tree.type === 'relation' && (
                <>
                    <ContextMenuSeparator/>
                    <ContextMenuItem onClick={() => onAddRelationToDashboard(path, tree)}>
                        <LayoutDashboard size={16} className="mr-2"/>
                        <span>Add to Dashboard</span>
                    </ContextMenuItem>
                </>
            )}

        </>
    );
}
