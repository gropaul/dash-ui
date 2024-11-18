import React, {useState} from "react";
import {ChevronDown, ChevronRight} from "lucide-react";

export interface TreeNode {
    name: string; // also serves as unique key
    type: string;
    children?: TreeNode[];
}

export interface TreeExplorerNodeProps {
    tree: TreeNode;
    iconFactory: (type: string) => React.ReactNode;

    tree_id_path: string[]
    onClickCallback: (tree_id_path: string[]) => void;
    onDoubleClickCallback?: (tree_id_path: string[]) => void;
}

function TreeExplorerNode({
                              tree,
                              iconFactory,
                              tree_id_path,
                              onClickCallback,
                              onDoubleClickCallback
                          }: TreeExplorerNodeProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = tree.children && tree.children.length > 0;

    const toggleExpand = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    const depth = tree_id_path.length;
    const current_tree_id_path = tree_id_path.concat(tree.name);

    function localOnClick(e: React.MouseEvent) {
        onClickCallback(current_tree_id_path);
    }

    function localOnDoubleClick(e: React.MouseEvent) {
        if (onDoubleClickCallback) {
            onDoubleClickCallback(current_tree_id_path);
        } else {
            if (hasChildren) {

                setIsExpanded(!isExpanded);
            }
        }
    }

    return (
        <>
            {/* Node content */}
            <div
                className="flex items-center p-0.5 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
                style={{paddingLeft: `${depth * 1.5}rem`}}
                onClick={localOnClick}
                onDoubleClick={localOnDoubleClick}
                onMouseDown={(e) => e.preventDefault()}
            >
                {/* Expand/collapse icon */}
                <div
                    onClick={toggleExpand}
                    className="cursor-pointer flex-shrink-0 flex items-center"
                    style={{width: '1.5rem'}}
                >
                    {/* Expand/collapse icon */}
                    {hasChildren && (isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>)}
                </div>
                <div
                    className="flex-shrink-0 flex items-center"
                    style={{width: '1.5rem'}}
                >
                    {iconFactory(tree.type)}
                </div>
                {/* Node name with flex-grow to use remaining space */}
                <div className="flex-grow whitespace-nowrap break-words">
                    {tree.name}
                </div>
            </div>

            {/* Child nodes */}
            {isExpanded && hasChildren && (
                <>
                    {tree.children?.map((child, index) => (
                        <TreeExplorerNode
                            key={index}
                            tree={child}
                            iconFactory={iconFactory}
                            tree_id_path={current_tree_id_path}
                            onClickCallback={onClickCallback}
                        />
                    ))}
                </>
            )}
        </>
    );
}

export interface TreeExplorerProps {
    tree: TreeNode | TreeNode[];
    iconFactory: (type: string) => React.ReactNode;
    onClick: (tree_id_path: string[]) => void;
    onDoubleClick?: (tree_id_path: string[]) => void;
}

export function TreeExplorer({tree, iconFactory, onClick, onDoubleClick}: TreeExplorerProps) {
    // Convert tree to array if it’s a single TreeNode
    const trees = Array.isArray(tree) ? tree : [tree];

    return (
        <div className="h-fit">
            {trees.map((treeNode, index) => (
                <TreeExplorerNode
                    tree_id_path={[]}
                    key={index}
                    tree={treeNode}
                    iconFactory={iconFactory}
                    onClickCallback={onClick}
                    onDoubleClickCallback={onDoubleClick}
                />
            ))}
        </div>
    );
}
