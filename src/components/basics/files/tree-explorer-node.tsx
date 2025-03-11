import {TreeNode} from "@/components/basics/files/tree-utils";
import React, {useState} from "react";
import {ContextMenu, ContextMenuContent, ContextMenuTrigger} from "@/components/ui/context-menu";
import {cn} from "@/lib/utils";
import {ChevronDown, ChevronRight} from "lucide-react";
import {SelectionMode, TreeContextMenuFactory} from "@/components/basics/files/tree-explorer";
import {useDraggable, useDroppable} from "@dnd-kit/core";

export interface TreeExplorerNodeProps {
    tree: TreeNode;
    iconFactory: (type: string) => React.ReactNode;

    parent_id_path: string[]
    onPointerDown?: (tree_id_path: string[], node: TreeNode, e: React.PointerEvent) => void;
    onClick: (tree_id_path: string[], node: TreeNode, e: React.MouseEvent) => void;
    onExpandedChange?: (tree_id_path: string[], node: TreeNode, expanded: boolean) => void;
    onDoubleClick?: (tree_id_path: string[], node: TreeNode) => void;
    loadChildren?: (tree_id_path: string[]) => void;

    orderBy?: (a: TreeNode, b: TreeNode) => number;

    contextMenuFactory?: TreeContextMenuFactory;

    selectedIds?: string[][];
    selectionMode: SelectionMode;
    enableDnd?: boolean;
}

export function TreeExplorerNode(props: TreeExplorerNodeProps) {

    const childrenLoaded = props.tree.children !== undefined;
    const cantHaveChildren = props.tree.children === null;
    const enableDnd = props.enableDnd ?? false;

    const depth = props.parent_id_path.length;
    const id = props.tree.id;
    const current_tree_id_path = props.parent_id_path.concat(props.tree.id);

    const [isExpanded, setIsExpanded] = useState(props.tree.expanded ?? false);
    const {listeners, setNodeRef: setDraggableNodeRef} = useDraggable({id: id});
    const {setNodeRef: setDroppableNodeRef, isOver} = useDroppable({
        id: id, data: {
            path: current_tree_id_path,
            canHaveChildren: !cantHaveChildren
        }
    });

    // listen for changes in the expanded prop
    React.useEffect(() => {
        setIsExpanded(props.tree.expanded ?? false);
    }, [props.tree.expanded]);


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
            `bg-[rgba(0,96,255,0.04)] hover:bg-[rgba(0,96,255,0.08)]` :
            "bg-[hsl(var(--muted-light))] hover:bg-[hsl(var(--muted))]" :
        props.selectionMode === "active" ?
            `hover:bg-[rgba(0,96,255,0.08)]` :
            "hover:bg-[hsl(var(--muted))]";

    const classIsOver = isOver && enableDnd? "border border-primary bg-[rgba(0,96,255,0.08)]" : "border border-transparent";
    return (
        <>
            {/* Node content */}
            <ContextMenu>
                <ContextMenuTrigger disabled={!props.contextMenuFactory}>
                    {/* Node content */}
                    <div
                        className={cn('')}
                        onClick={localOnClick}
                        ref={setDroppableNodeRef}
                        onDoubleClick={localOnDoubleClick}
                        onMouseDown={(e) => e.preventDefault()}
                        onPointerDown={(e) => props.onPointerDown?.(current_tree_id_path, props.tree, e)}
                    >
                        <div
                            style={{paddingLeft: `${depth * 1.5}rem`}}
                            className={cn('flex items-center p-0.5 rounded-md', classIsSelected, classIsOver)}
                            ref={setDraggableNodeRef}
                            {...listeners}
                        >
                            {/* Expand/collapse icon */}
                            <div
                                onClick={toggleExpand}
                                className="cursor-pointer flex-shrink-0 flex items-center"
                                style={{width: '1.5rem'}}
                            >
                                {/* Expand/collapse icon */}
                                {!cantHaveChildren && (isExpanded ?
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
                                enableDnd={enableDnd}
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
                            enableDnd={false}
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
