'use client';

import React, {useEffect, useState} from "react";
import {toast} from "sonner";
import {ChevronRight, Plus} from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    pointerWithin,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {cn} from "@/lib/utils";
import {Expandable} from "@/components/basics/expandable";
import {ContextMenu, ContextMenuContent, ContextMenuTrigger} from "@/components/ui/context-menu";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {useGUIState} from "@/state/gui.state";
import {DashNavigator} from "@/state/routing/navigation";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {useWorkspace, useWorkspaceTree} from "@/state/workspace/workspace.state";
import {WorkspaceNode} from "@/state/workspace/workspace-tree";
import {ancestorsOf, baseName, isWithin, joinPath, parentOf} from "@/state/workspace/paths";
import {viewOfQuery} from "@/state/workspace/relation-config";
import {fileIconType} from "@/components/workspace/file-icon";
import {moveEntry, newFile} from "@/components/workspace/file-actions";
import {FileMenuItems} from "@/components/workspace/file-menu-items";
import {SectionHeader} from "@/components/layout/navigation-sidebar";

// The section's header takes drops onto the top level of the workspace.
const ROOT_DROP_ID = 'workspace-tree-root';

interface TreeContext {
    projectId: string;
    currentPath: string | null;
    open: Set<string>;
}

/**
 * The project's folders and files as a tree in the sidebar, the only way to browse the workspace, after shadcn's
 * File Tree: folders are Collapsibles that only open and close, files are links. Dragging an item onto a folder,
 * or onto the header for the top level, moves it there.
 */
export function WorkspaceTree({projectId}: { projectId: string }) {
    const tree = useWorkspaceTree();
    const stored = useGUIState(s => s.workspaceTreeOpen[projectId]);
    const setFolderOpen = useGUIState(s => s.setWorkspaceFolderOpen);
    const [dragging, setDragging] = useState<WorkspaceNode | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}));
    const {setNodeRef: rootRef, isOver: overRoot} = useDroppable({id: ROOT_DROP_ID, data: {path: ''}});

    // Re-renders on navigation, so the open file is marked; its folders open as it is opened.
    useDashLocation();
    const currentPath = DashNavigator.instance().getCurrentPath();
    useEffect(() => {
        if (currentPath) ancestorsOf(currentPath).forEach(dir => setFolderOpen(projectId, dir, true));
    }, [currentPath, projectId, setFolderOpen]);

    const onDragStart = ({active}: DragStartEvent) => setDragging(active.data.current?.node as WorkspaceNode ?? null);

    const onDragEnd = async ({active, over}: DragEndEvent) => {
        setDragging(null);
        const node = active.data.current?.node as WorkspaceNode | undefined;
        const folder = over?.data.current?.path as string | undefined;
        if (!node || folder === undefined) return;
        // Into itself or where it already is.
        if (isWithin(folder, node.path) || folder === parentOf(node.path)) return;
        try {
            await moveEntry(node.path, joinPath(folder, baseName(node.path)));
            if (folder) setFolderOpen(projectId, folder, true);
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const context: TreeContext = {projectId, currentPath, open: new Set(stored ?? [])};

    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}
                    onDragCancel={() => setDragging(null)}>
            <div className="px-2 pt-4">
                <div ref={rootRef} className={cn("flex items-center rounded-md", overRoot && "bg-primary/10 ring-1 ring-primary/40")}>
                    <div className="min-w-0 flex-1"><SectionHeader label="Files" extended={true}/></div>
                    <NewItemButton/>
                </div>
                <div className="flex flex-col gap-0.5">
                    {tree.map(node => <TreeItem key={node.path} node={node} context={context}/>)}
                </div>
            </div>
            <DragOverlay dropAnimation={null}>
                {dragging && (
                    <div className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-sm shadow-md">
                        <ColoredIcon type={fileIconType(dragging)} size={16} background={false}/>
                        <span className="truncate">{dragging.name}</span>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}

function NewItemButton() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger aria-label="New"
                                 className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
                <Plus className="h-3.5 w-3.5"/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => newFile('page')}>New page</DropdownMenuItem>
                <DropdownMenuItem onClick={() => newFile('query')}>New query</DropdownMenuItem>
                <DropdownMenuItem onClick={() => newFile('folder')}>New folder</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function TreeItem({node, context}: { node: WorkspaceNode, context: TreeContext }) {
    const isFolder = node.kind === 'folder';
    const isOpen = isFolder && context.open.has(node.path);
    const setFolderOpen = useGUIState(s => s.setWorkspaceFolderOpen);
    // Subscribed, so a query's icon follows its view.
    useWorkspace(s => node.kind === 'query' ? viewOfQuery(s.files[node.path] ?? '') : undefined);

    const {setNodeRef: dragRef, attributes, listeners, isDragging} = useDraggable({id: node.path, data: {node}});
    const {setNodeRef: dropRef, isOver} = useDroppable({id: node.path, data: {path: node.path}, disabled: !isFolder});
    const nav = DashNavigator.instance();
    const toggle = (open: boolean) => setFolderOpen(context.projectId, node.path, open);
    const isCurrent = context.currentPath === node.path;

    const label = (
        <>
            <ColoredIcon type={fileIconType(node)} size={16} background={false}/>
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
        </>
    );

    const row = (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    ref={el => {
                        dragRef(el);
                        dropRef(el);
                    }}
                    {...attributes}
                    {...listeners}
                    className={cn(
                        "flex h-8 items-center gap-1.5 rounded-md pr-2 text-sm select-none transition-colors",
                        isCurrent
                            ? "bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        isOver && "bg-primary/10 ring-1 ring-primary/40",
                        isDragging && "opacity-40",
                    )}
                >
                    {isFolder ? (
                        <button
                            type="button"
                            aria-label={isOpen ? "Close folder" : "Open folder"}
                            onClick={() => toggle(!isOpen)}
                            className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch text-left"
                        >
                            <ChevronRight className={cn("h-3.5 w-5 shrink-0 transition-transform", isOpen && "rotate-90")}/>
                            {label}
                        </button>
                    ) : (
                        <a
                            href={nav.getUrlFromPath(node.path)}
                            // The browser's own link drag would compete with moving the item.
                            draggable={false}
                            onClick={nav.onClickNavigateToPath(node.path)}
                            aria-current={isCurrent ? "page" : undefined}
                            className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch pl-5"
                        >
                            {label}
                        </a>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <FileMenuItems variant="context" path={node.path} isFolder={isFolder}/>
            </ContextMenuContent>
        </ContextMenu>
    );

    if (!isFolder) return row;
    return (
        <div>
            {row}
            <Expandable open={isOpen} className="flex flex-col gap-0.5 pl-3">
                {(node.children ?? []).map(child => (
                    <TreeItem key={child.path} node={child} context={context}/>
                ))}
            </Expandable>
        </div>
    );
}
