import React, {useEffect, useRef, useState} from "react";
import {ChevronDown, ChevronRight} from "lucide-react";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {ContextMenu, ContextMenuContent, ContextMenuTrigger} from "@/components/ui/context-menu";
import {cn} from "@/lib/utils";
import {TreeExplorerNode} from "@/components/basics/files/tree-explorer-node";


export type TreeContextMenuFactory = (tree_id_path: string[], tree: TreeNode) => React.ReactNode;

// active: the last focus event was on the tree
// passive: the last focus event was outside the tree
export type SelectionMode = "active" | "passive";

export interface TreeExplorerProps {
    tree: TreeNode | TreeNode[];
    iconFactory: (type: string) => React.ReactNode;
    onClick: (tree_id_path: string[], node: TreeNode, e: React.MouseEvent) => void;
    onDoubleClick?: (tree_id_path: string[], node: TreeNode) => void;
    contextMenuFactory?: TreeContextMenuFactory;
    onExpandedChange?: (tree_id_path: string[], node: TreeNode, expanded: boolean) => void;

    loadChildren?: (tree_id_path: string[]) => void;
    orderBy?: (a: TreeNode, b: TreeNode) => number;

    selectedIds?: string[][];
}

export function TreeExplorer({
                                 tree,
                                 iconFactory,
                                 onClick,
                                 onDoubleClick,
                                 loadChildren,
                                 contextMenuFactory,
                                 onExpandedChange,
                                 orderBy,
                                 selectedIds
                             }: TreeExplorerProps) {
    // Convert tree to array if it’s a single TreeNode
    const trees = Array.isArray(tree) ? tree : [tree];
    const sortedTrees = orderBy ? trees.sort(orderBy) : trees;
    const containerRef = useRef<HTMLDivElement>(null);

    const [selectionMode, setSelectionMode] = useState<SelectionMode>("passive");

    // listen to pointer down events to determine if the tree is active, if clicked
    // somewhere else, the tree is passive

    useEffect(() => {
        function handlePointerDown(e: MouseEvent) {
            if (
                containerRef.current &&
                containerRef.current.contains(e.target as Node)
            ) {
                // Click is inside the tree => set "active"
                setSelectionMode("active");
            } else {
                // Click is outside the tree => set "passive"
                setSelectionMode("passive");
            }
        }

        // Use capture phase so we run before other onPointerDowns
        document.addEventListener("pointerdown", handlePointerDown, true);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown, true);
        };
    }, []);
    return (
        <div className="h-fit" ref={containerRef}>
            {sortedTrees.map((treeNode, index) => (
                <TreeExplorerNode
                    orderBy={orderBy}
                    parent_id_path={[]}
                    key={index}
                    tree={treeNode}
                    iconFactory={iconFactory}
                    loadChildren={loadChildren}
                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    contextMenuFactory={contextMenuFactory}
                    onExpandedChange={onExpandedChange}

                    selectedIds={selectedIds}
                    selectionMode={selectedIds === undefined ? "passive" : selectionMode}
                />
            ))}
        </div>
    )
        ;
}
