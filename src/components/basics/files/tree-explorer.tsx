import React, {useEffect, useRef, useState} from "react";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {TreeExplorerNode} from "@/components/basics/files/tree-explorer-node";
import {TreeDndContext} from "@/components/basics/files/tree-dnd-context";


export type TreeContextMenuFactory = (tree_id_path: string[], tree: TreeNode) => React.ReactNode;

// active: the last focus event was on the tree
// passive: the last focus event was outside the tree
export type SelectionMode = "active" | "passive";

export interface TreeExplorerProps {
    tree: TreeNode | TreeNode[];

    onPointerDown?: (tree_id_path: string[], node: TreeNode, e: React.PointerEvent) => void;
    onClick: (tree_id_path: string[], node: TreeNode, e: React.MouseEvent) => void;
    onDoubleClick?: (tree_id_path: string[], node: TreeNode) => void;
    onExpandedChange?: (tree_id_path: string[], node: TreeNode, expanded: boolean) => void;

    contextMenuFactory?: TreeContextMenuFactory;
    iconFactory: (type: string) => React.ReactNode;

    loadChildren?: (tree_id_path: string[]) => void;
    orderBy?: (a: TreeNode, b: TreeNode) => number;

    selectedIds?: string[][];
    enableDnd?: boolean;
}

export function TreeExplorer({
                                 tree,
                                 iconFactory,
                                 onPointerDown,
                                 onClick,
                                 onDoubleClick,
                                 loadChildren,
                                 contextMenuFactory,
                                 onExpandedChange,
                                 orderBy,
                                 selectedIds,
                                 enableDnd = true,
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
            <TreeDndContext
                enabled={enableDnd}
                tree={sortedTrees}
                selectedIds={selectedIds}
                iconFactory={iconFactory}
            >
                {sortedTrees.map((treeNode, index) => (
                    <TreeExplorerNode
                        orderBy={orderBy}
                        parent_id_path={[]}
                        key={index}
                        tree={treeNode}
                        loadChildren={loadChildren}
                        onPointerDown={onPointerDown}
                        onClick={onClick}
                        onDoubleClick={onDoubleClick}
                        iconFactory={iconFactory}
                        contextMenuFactory={contextMenuFactory}
                        onExpandedChange={onExpandedChange}

                        selectedIds={selectedIds}
                        selectionMode={selectedIds === undefined ? "passive" : selectionMode}
                    />
                ))}
            </TreeDndContext>
        </div>
    )
}
