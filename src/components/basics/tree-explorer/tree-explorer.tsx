import React, {useState} from "react";
import {ChevronDown, ChevronRight} from "lucide-react";
import {TreeNode} from "@/components/basics/tree-explorer/tree-utils";
import {ContextMenu, ContextMenuContent, ContextMenuTrigger} from "@/components/ui/context-menu";


export interface TreeExplorerNodeProps {
    tree: TreeNode;
    iconFactory: (type: string) => React.ReactNode;

    parent_id_path: string[]
    onClickCallback: (tree_id_path: string[]) => void;
    onDoubleClickCallback?: (tree_id_path: string[]) => void;

    loadChildren?: (tree_id_path: string[]) => void;

    contextMenuFactory?: TreeContextMenuFactory;
}

function TreeExplorerNode(props: TreeExplorerNodeProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const childrenLoaded = props.tree.children !== undefined;
    const hasNoChildren = props.tree.children === null;

    const depth = props.parent_id_path.length;
    const current_tree_id_path = props.parent_id_path.concat(props.tree.id);

    const toggleExpand = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // if the children are not loaded, load them
        if (!childrenLoaded && props.loadChildren) {
            props.loadChildren(current_tree_id_path);
        }

        setIsExpanded(!isExpanded);
    };


    function localOnClick(e: React.MouseEvent) {
        props.onClickCallback(current_tree_id_path);
    }

    function localOnDoubleClick(e: React.MouseEvent) {
        if (props.onDoubleClickCallback) {
            props.onDoubleClickCallback(current_tree_id_path);
        } else {
            if (childrenLoaded) {
                setIsExpanded(!isExpanded);
            }
        }
    }

    const chevronSize = 16;
    const chevronColor = "#9a9a9a";

    return (
        <>
            {/* Node content */}
            <ContextMenu>
                <ContextMenuTrigger disabled={!props.contextMenuFactory}>
                    {/* Node content */}
                    <div
                        className="flex items-center p-0.5 cursor-pointer bg-background hover:bg-accent"
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
                            {!hasNoChildren && (isExpanded ?
                                <ChevronDown size={chevronSize} color={chevronColor}/> :
                                <ChevronRight size={chevronSize} color={chevronColor}/>)}
                        </div>
                        <div
                            className="flex-shrink-0 flex items-center"
                            style={{width: '1.5rem'}}
                        >
                            {props.iconFactory(props.tree.type)}
                        </div>
                        {/* Node name with flex-grow to use remaining space */}
                        <div className="flex-grow whitespace-nowrap break-words">
                            {props.tree.name}
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {props.contextMenuFactory && props.contextMenuFactory(current_tree_id_path, props.tree)}
                </ContextMenuContent>

            </ContextMenu>
            {isExpanded && (
                childrenLoaded ?
                    <>
                        {props.tree.children?.map((child, index) => (
                            <TreeExplorerNode
                                {...props}
                                key={index}
                                tree={child}
                                parent_id_path={current_tree_id_path}
                            />
                        ))}
                    </>
                    :
                    <div className="pl-2">
                        <TreeExplorerNode
                            tree={{
                                id: "",
                                name: "Loading...",
                                type: "loading",
                                children: []
                            }}
                            iconFactory={props.iconFactory}
                            parent_id_path={current_tree_id_path}
                            onClickCallback={props.onClickCallback}
                        />
                    </div>
            )
            }
        </>
    );
}

export type TreeContextMenuFactory = (tree_id_path: string[], tree: TreeNode) => React.ReactNode;


export interface TreeExplorerProps {
    tree: TreeNode | TreeNode[];
    iconFactory: (type: string) => React.ReactNode;
    onClick: (tree_id_path: string[]) => void;
    onDoubleClick?: (tree_id_path: string[]) => void;
    contextMenuFactory?: TreeContextMenuFactory;
    loadChildren?: (tree_id_path: string[]) => void;
}

export function TreeExplorer({
                                 tree,
                                 iconFactory,
                                 onClick,
                                 onDoubleClick,
                                 loadChildren,
                                 contextMenuFactory
                             }: TreeExplorerProps) {
    // Convert tree to array if it’s a single TreeNode
    const trees = Array.isArray(tree) ? tree : [tree];

    return (
        <div className="h-fit bg-background">
            {trees.map((treeNode, index) => (
                    <TreeExplorerNode
                        parent_id_path={[]}
                        key={index}
                        tree={treeNode}
                        iconFactory={iconFactory}
                        loadChildren={loadChildren}
                        onClickCallback={onClick}
                        onDoubleClickCallback={onDoubleClick}
                        contextMenuFactory={contextMenuFactory}
                    />
                )
            )}
        </div>
    )
        ;
}
