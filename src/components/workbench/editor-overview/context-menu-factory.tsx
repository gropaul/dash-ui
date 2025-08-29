import {TreeNode} from "@/components/basics/files/tree-utils";
import {Copy, Folder, LayoutDashboard, PencilLine, Plus, Sheet, Trash} from "lucide-react";
import React from "react";
import {
    ResponsiveMenuItem, ResponsiveMenuSeparator,
    ResponsiveMenuSub,
    ResponsiveMenuSubContent,
    ResponsiveMenuSubTrigger
} from "@/components/basics/responsive-menu/responsive-menu";

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
                    <ResponsiveMenuSub>
                        <ResponsiveMenuSubTrigger>
                            <Plus size={16} className="mr-2"/>
                            <span>New ...</span>
                        </ResponsiveMenuSubTrigger>
                        <ResponsiveMenuSubContent className="max-w-64 truncate text-left">
                            <ResponsiveMenuItem onClick={() => onAddNewFolder(path, tree)}>
                                <Folder size={16} className="mr-2"/>
                                <span>Folder</span>
                            </ResponsiveMenuItem>
                            <ResponsiveMenuItem onClick={() => onAddNewRelation(path, tree)}>
                                <Sheet size={16} className="mr-2"/>
                                <span>Query</span>
                            </ResponsiveMenuItem>
                            <ResponsiveMenuItem onClick={() => onAddNewDashboard(path, tree)}>
                                <LayoutDashboard size={16} className="mr-2"/>
                                <span>Dashboard</span>
                            </ResponsiveMenuItem>
                        </ResponsiveMenuSubContent>
                    </ResponsiveMenuSub>
                    <ResponsiveMenuSeparator/>
                </>
            )}
            <ResponsiveMenuItem onClick={() => onRename(path, tree)}>
                <PencilLine size={16} className="mr-2"/>
                <span>Rename</span>
            </ResponsiveMenuItem>
            <ResponsiveMenuItem onClick={() => onDelete(path, tree)}>
                <Trash size={16} className="mr-2"/>
                <span>Delete</span>
            </ResponsiveMenuItem>
            {tree.type !== 'folder' && (
                <ResponsiveMenuItem onClick={() => onDuplicate(path, tree)}>
                    <Copy size={16} className="mr-2"/>
                    <span>Duplicate</span>
                </ResponsiveMenuItem>
            )}
            {tree.type === 'relations' && (
                <>
                    <ResponsiveMenuSeparator/>
                    <ResponsiveMenuItem onClick={() => onAddRelationToDashboard(path, tree)}>
                        <LayoutDashboard size={16} className="mr-2"/>
                        <span>Add to Dashboard</span>
                    </ResponsiveMenuItem>
                </>
            )}

        </>
    );
}
