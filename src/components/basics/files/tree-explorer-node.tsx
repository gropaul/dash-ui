import {TreeNode} from "@/components/basics/files/tree-utils";
import React, {useState} from "react";
import {ContextMenu, ContextMenuContent, ContextMenuTrigger} from "@/components/ui/context-menu";
import {cn} from "@/lib/utils";
import {ChevronDown, ChevronRight} from "lucide-react";
import {SelectionMode, TreeContextMenuFactory} from "@/components/basics/files/tree-explorer";

export interface TreeExplorerNodeProps {
    tree: TreeNode;
    iconFactory: (type: string) => React.ReactNode;

    parent_id_path: string[]
    onClick: (tree_id_path: string[], node: TreeNode, e: React.MouseEvent) => void;
    onExpandedChange?: (tree_id_path: string[], node: TreeNode, expanded: boolean) => void;
    onDoubleClick?: (tree_id_path: string[], node: TreeNode) => void;
    loadChildren?: (tree_id_path: string[]) => void;

    orderBy?: (a: TreeNode, b: TreeNode) => number;

    contextMenuFactory?: TreeContextMenuFactory;

    selectedIds?: string[][];
    selectionMode: SelectionMode;
}

export function TreeExplorerNode(props: TreeExplorerNodeProps) {
    const [isExpanded, setIsExpanded] = useState(props.tree.expanded ?? false);

    // listen for changes in the expanded prop
    React.useEffect(() => {
        setIsExpanded(props.tree.expanded ?? false);
    }, [props.tree.expanded]);

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
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        props.onExpandedChange?.(current_tree_id_path, props.tree, newExpanded);

    };

    function localOnClick(e: React.MouseEvent) {
        props.onClick(current_tree_id_path, props.tree, e);
    }

    function localOnDoubleClick(_e: React.MouseEvent) {
        if (props.onDoubleClick) {
            props.onDoubleClick(current_tree_id_path, props.tree);
        } else {
            if (childrenLoaded) {
                setIsExpanded(!isExpanded);
            }
        }
    }

    const chevronSize = 16;
    const chevronColor = "#9a9a9a";

    const children = props.tree.children ?? [];
    if (props.orderBy) {
        children.sort(props.orderBy);
    }

    // check selectedIds of length 1 to see if the current tree is selected
    const isSelected = props.selectedIds?.some((id_path) => id_path.length === 1 && id_path[0] === props.tree.id);

    // remove the first elements of the selectedIds that are not part of the current tree
    const childSelectedIds = props.selectedIds
        ?.filter((id_path) => id_path.length > 1)
        ?.map((id_path) => id_path.slice(1));

    const classIsSelected = isSelected ?
        props.selectionMode === "active" ?
            `bg-[rgba(0,96,255,0.06)] hover:bg-[rgba(0,96,255,0.10)]` :
            "bg-[hsl(var(--muted-light))] hover:bg-[hsl(var(--muted))]" :
        props.selectionMode === "active" ?
            `hover:bg-[rgba(0,96,255,0.10)]` :
            "hover:bg-[hsl(var(--muted))]";

    return (
        <>
            {/* Node content */}
            <ContextMenu>
                <ContextMenuTrigger disabled={!props.contextMenuFactory}>
                    {/* Node content */}
                    <div
                        className={cn('flex items-center p-0.5 rounded-md', classIsSelected)}
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
                <ContextMenuContent className={'min-w-40'}>
                    {props.contextMenuFactory && props.contextMenuFactory(current_tree_id_path, props.tree)}
                </ContextMenuContent>

            </ContextMenu>
            {isExpanded && (
                childrenLoaded ?
                    <>
                        {children.map((child, index) => (
                            <TreeExplorerNode
                                {...props}
                                selectedIds={childSelectedIds}
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
                            onClick={props.onClick}
                            selectionMode={props.selectionMode}
                        />
                    </div>
            )
            }
        </>
    );
}
