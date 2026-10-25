'use client';

import React, {useEffect, useState} from "react";
import {toast} from "sonner";
import {ChevronRight} from "lucide-react";
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
import {Collapsible, CollapsibleContent} from "@/components/ui/collapsible";
import {ContextMenu, ContextMenuContent, ContextMenuTrigger} from "@/components/ui/context-menu";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {findNodeInTrees, findPathById} from "@/components/basics/files/tree-utils";
import {EditorFolder} from "@/model/editor-folder";
import {useRelationsState} from "@/state/relations.state";
import {useGUIState} from "@/state/gui.state";
import {DashNavigator} from "@/state/routing/navigation";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {moveClash, pageFolderOf} from "@/state/routing/page-links";
import {EntityActionHandlers, useEntityActions} from "@/components/workbench/editor-overview/use-entity-actions";
import {EntityMenuItems} from "@/components/workbench/editor-overview/entity-menu-items";
import {SectionHeader} from "@/components/layout/navigation-sidebar";

// The section's header takes drops onto the top level of the workspace.
const ROOT_DROP_ID = 'workspace-tree-root';

interface TreeContext {
    tree: EditorFolder[];
    projectId: string;
    currentId?: string;
    open: Set<string>;
    handlers: EntityActionHandlers;
}

/**
 * The project's folders, pages, queries and canvases as a tree in the sidebar, for getting around, after shadcn's
 * File Tree: folders are Collapsibles, items are buttons. A click opens the item; dragging it onto a folder, or
 * onto the header for the top level, moves it there.
 */
export function WorkspaceTree({projectId}: { projectId: string }) {
    const tree = useRelationsState(s => s.editorElements);
    const applyEditorElementsActions = useRelationsState(s => s.applyEditorElementsActions);
    const stored = useGUIState(s => s.workspaceTreeOpen[projectId]);
    const setFolderOpen = useGUIState(s => s.setWorkspaceFolderOpen);
    const {handlers, dialogs} = useEntityActions();
    const [dragging, setDragging] = useState<EditorFolder | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}));
    const {setNodeRef: rootRef, isOver: overRoot} = useDroppable({id: ROOT_DROP_ID, data: {path: []}});

    // Re-renders on navigation, so the open item is marked; its folders open as it is opened.
    useDashLocation();
    const currentId = DashNavigator.instance().getCurrentObject()?.id;
    useEffect(() => {
        const ancestors = currentId ? findPathById(tree, currentId)?.slice(0, -1) ?? [] : [];
        ancestors.forEach(id => setFolderOpen(projectId, id, true));
    }, [currentId, tree, projectId, setFolderOpen]);

    const onDragStart = ({active}: DragStartEvent) => {
        const path = active.data.current?.path as string[];
        setDragging(findNodeInTrees(tree, path) as EditorFolder ?? null);
    };

    const onDragEnd = ({active, over}: DragEndEvent) => {
        setDragging(null);
        const from = active.data.current?.path as string[] | undefined;
        const target = over?.data.current?.path as string[] | undefined;
        const node = from && findNodeInTrees(tree, from);
        if (!from || !target || !node) return;
        // Into itself or where it already is.
        if (from.every((id, i) => target[i] === id) || target.join('/') === from.slice(0, -1).join('/')) return;
        if (moveClash(tree, target, node as EditorFolder)) {
            toast.error(`"${node.name}" is already in that folder.`);
            return;
        }
        // The open item may be the one moved or inside it; its address changes, so follow it.
        const shown = DashNavigator.instance().getCurrentObject();
        applyEditorElementsActions([{type: 'move', id_path: from, target_id_path: target}]);
        if (shown && !DashNavigator.instance().getCurrentObject()) DashNavigator.instance().navigateToObjectId(shown.id, true);
        if (target.length) setFolderOpen(projectId, target.at(-1)!, true);
    };

    // A folder's page shows as its folder.
    const shownId = currentId && (pageFolderOf(tree, currentId)?.id ?? currentId);
    const context: TreeContext = {tree, projectId, currentId: shownId, open: new Set(stored ?? []), handlers};

    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}
                    onDragCancel={() => setDragging(null)}>
            <div className="px-2 pt-4">
                <div ref={rootRef} className={cn("rounded-md", overRoot && "bg-primary/10 ring-1 ring-primary/40")}>
                    <SectionHeader label="Files" extended={true}/>
                </div>
                <div className="flex flex-col gap-0.5">
                    {listed(tree, tree).map(node => <TreeItem key={node.id} node={node} path={[node.id]} context={context}/>)}
                </div>
            </div>
            <DragOverlay dropAnimation={null}>
                {dragging && (
                    <div className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-sm shadow-md">
                        <ColoredIcon type={iconType(dragging)} size={16} background={false}/>
                        <span className="truncate">{dragging.name}</span>
                    </div>
                )}
            </DragOverlay>
            {dialogs}
        </DndContext>
    );
}

// A folder's page is listed as its folder. Canvases are disabled during the move to files.
function listed(tree: EditorFolder[], nodes: EditorFolder[]) {
    return nodes.filter(node => node.type !== 'canvas' && !pageFolderOf(tree, node.id));
}

// Queries take the icon of their view, as in the folder view.
function iconType(node: EditorFolder) {
    if (node.type !== 'relations') return node.type;
    return useRelationsState.getState().relations[node.id]?.viewState.selectedView ?? 'relations';
}

function TreeItem({node, path, context}: { node: EditorFolder, path: string[], context: TreeContext }) {
    const isFolder = node.type === 'folder';
    const isOpen = isFolder && context.open.has(node.id);
    const setFolderOpen = useGUIState(s => s.setWorkspaceFolderOpen);
    // Subscribed, so a query's icon follows its view.
    useRelationsState(s => node.type === 'relations' ? s.relations[node.id]?.viewState.selectedView : undefined);

    const {setNodeRef: dragRef, attributes, listeners, isDragging} = useDraggable({id: node.id, data: {path}});
    const {setNodeRef: dropRef, isOver} = useDroppable({id: node.id, data: {path}, disabled: !isFolder});
    const nav = DashNavigator.instance();
    const toggle = (open: boolean) => setFolderOpen(context.projectId, node.id, open);

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
                        context.currentId === node.id
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
                            className="flex h-6 w-5 shrink-0 items-center justify-center rounded hover:bg-accent"
                        >
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}/>
                        </button>
                    ) : <span className="w-5 shrink-0"/>}
                    <a
                        href={nav.getUrlFromObjectId(node.id)}
                        // The browser's own link drag would compete with moving the item.
                        draggable={false}
                        onClick={e => {
                            nav.onClickNavigateToObjectId(node.id)(e);
                            // A folder opens in the tree as it is opened.
                            if (isFolder && e.defaultPrevented) toggle(true);
                        }}
                        aria-current={context.currentId === node.id ? "page" : undefined}
                        className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch"
                    >
                        <ColoredIcon type={iconType(node)} size={16} background={false}/>
                        <span className="min-w-0 flex-1 truncate">{node.name}</span>
                    </a>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <EntityMenuItems variant="context" path={path} tree={node} handlers={context.handlers}/>
            </ContextMenuContent>
        </ContextMenu>
    );

    if (!isFolder) return row;
    return (
        <Collapsible open={isOpen} onOpenChange={toggle}>
            {row}
            <CollapsibleContent className="flex flex-col gap-0.5 pl-3">
                {listed(context.tree, node.children ?? []).map(child => (
                    <TreeItem key={child.id} node={child} path={[...path, child.id]} context={context}/>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}
