import {TreeNode} from "@/components/basics/files/tree-utils";
import React, {useCallback, useState} from "react";
import {cn} from "@/lib/utils";
import {ChevronRight} from "lucide-react";
import {SelectionMode, TreeContextMenuFactory} from "@/components/basics/files/tree-explorer";
import {useDraggable, useDroppable} from "@dnd-kit/core";
import {
    ResponsiveMenu,
    ResponsiveMenuContent,
    ResponsiveMenuTrigger
} from "@/components/basics/responsive-menu/responsive-menu";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";

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
    const [isTruncated, setIsTruncated] = useState(false);
    const nameRef = useCallback((node: HTMLDivElement | null) => {
        if (node) {
            setIsTruncated(node.scrollWidth > node.clientWidth);
        }
    }, [props.tree.name]);
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
        } else if (!cantHaveChildren && childrenLoaded) {
            setIsExpanded(!isExpanded);
        }
    }

    const chevronSize = 16;

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
            `bg-primary/5 hover:bg-primary/10` :
            "bg-muted/50 hover:bg-muted" :
        props.selectionMode === "active" ?
            `hover:bg-primary/10` :
            "hover:bg-muted";

    const classIsOver = isOver && enableDnd ? "border border-primary bg-primary/10" : "border border-transparent";
    return (
        <div>
            {/* Node content */}
            <ResponsiveMenu>
                <ResponsiveMenuTrigger disabled={!props.contextMenuFactory} className={'w-full'}>
                    {/* Node content */}
                    <div
                        className={cn('relative')}
                        onClick={localOnClick}
                        ref={setDroppableNodeRef}
                        onDoubleClick={localOnDoubleClick}
                        onMouseDown={(e) => e.preventDefault()}
                        onPointerDown={(e) => props.onPointerDown?.(current_tree_id_path, props.tree, e)}
                    >
                        {/* Indent guide lines */}
                        {Array.from({length: depth}, (_, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 border-l border-border/40"
                                style={{left: `${i * 1.5 + 0.5}rem`}}
                            />
                        ))}
                        <div
                            style={{paddingLeft: `${depth * 1.5}rem`}}
                            className={cn('flex text-accent-foreground items-center p-0.5 rounded-md', classIsSelected, classIsOver)}
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
                                {!cantHaveChildren && (
                                    <ChevronRight
                                        size={chevronSize}
                                        className={cn(
                                            'text-muted-foreground transition-transform duration-150',
                                            isExpanded && 'rotate-90'
                                        )}
                                    />
                                )}
                            </div>
                            <div
                                className="flex-shrink-0 flex items-center"
                                style={{width: '1.5rem'}}
                            >
                                {props.iconFactory(props.tree.type)}
                            </div>
                            {/* Node name with flex-grow to use remaining space */}
                            <TooltipProvider delayDuration={500}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div ref={nameRef} className="flex-grow truncate">
                                            {props.tree.name}
                                        </div>
                                    </TooltipTrigger>
                                    {isTruncated && (
                                        <TooltipContent side="top" className="max-w-80">
                                            {props.tree.name}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </ResponsiveMenuTrigger>
                <ResponsiveMenuContent className={'min-w-40'}>
                    {props.contextMenuFactory && props.contextMenuFactory(current_tree_id_path, props.tree)}
                </ResponsiveMenuContent>

            </ResponsiveMenu>
            <div
                className="grid transition-[grid-template-rows] duration-150 ease-out"
                style={{gridTemplateRows: isExpanded ? '1fr' : '0fr'}}
            >
                <div className="overflow-hidden min-h-0">
                    {(isExpanded || childrenLoaded) && (
                        childrenLoaded ?
                            children.length > 0 ?
                                children.map((child) => (
                                    <TreeExplorerNode
                                        {...props}
                                        enableDnd={enableDnd}
                                        selectedIds={childSelectedIds}
                                        key={child.id}
                                        tree={child}
                                        parent_id_path={current_tree_id_path}
                                    />
                                ))
                                :
                                <div
                                    className="text-muted-foreground text-xs py-0.5 italic"
                                    style={{paddingLeft: `${(depth + 1) * 1.5 + 1.5}rem`}}
                                >
                                    No items
                                </div>
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
                    )}
                </div>
            </div>
        </div>
    );
}
