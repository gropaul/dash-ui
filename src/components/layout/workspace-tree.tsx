'use client';

import React, {useEffect, useMemo, useRef} from "react";
import {toast} from "sonner";
import {ChevronRight, Plus} from "lucide-react";
import {dragAndDropFeature, hotkeysCoreFeature, ItemInstance, selectionFeature, syncDataLoaderFeature} from "@headless-tree/core";
import {useTree} from "@headless-tree/react";
import {cn} from "@/lib/utils";
import {Expandable} from "@/components/basics/expandable";
import {ContextMenu, ContextMenuContent, ContextMenuTrigger} from "@/components/ui/context-menu";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {useGUIState} from "@/state/gui.state";
import {DashNavigator} from "@/state/routing/navigation";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {useWorkspace, useWorkspaceTree} from "@/state/workspace/workspace.state";
import {WorkspaceNode} from "@/state/workspace/workspace-tree";
import {ancestorsOf, baseName, joinPath, parentOf} from "@/state/workspace/paths";
import {viewOfQuery} from "@/state/workspace/relation-config";
import {fileIconType} from "@/components/workspace/file-icon";
import {moveEntry} from "@/components/workspace/file-actions";
import {FileMenuItems, NewFileItems} from "@/components/workspace/file-menu-items";
import {SectionHeader} from "@/components/layout/navigation-sidebar";

// Headless Tree's id for the top level, the workspace root ''.
const ROOT = '__root__';
const ROOT_NODE: WorkspaceNode = {path: '', name: '', kind: 'folder'};
const pathOf = (id: string) => id === ROOT ? '' : id;
// One array for "no folder open": a new one per render reads as a state change to Headless Tree, which re-renders.
const NO_FOLDERS: string[] = [];

// Each level's indent, in px.
const INDENT = 12;

/**
 * The project's folders and files as a tree in the sidebar, the only way to browse the workspace. Headless Tree
 * gives it keyboard navigation, multi-select (Shift, Cmd/Ctrl) and drag and drop: onto a folder, or between items,
 * marked by a line, into the folder at the line's level. The line below a folder's last item moves out a level as
 * the pointer moves left, so items can always leave a folder. Folders only open and close.
 */
export function WorkspaceTree({projectId}: { projectId: string }) {
    const nodes = useWorkspaceTree();
    const expanded = useGUIState(s => s.workspaceTreeOpen[projectId]);
    const setFolderOpen = useGUIState(s => s.setWorkspaceFolderOpen);

    // Re-renders on navigation, so the open file is marked; its folders open as it is opened.
    useDashLocation();
    const currentPath = DashNavigator.instance().getCurrentPath();
    useEffect(() => {
        if (currentPath) ancestorsOf(currentPath).forEach(dir => setFolderOpen(projectId, dir, true));
    }, [currentPath, projectId, setFolderOpen]);

    // The data loader reads the latest tree through a ref; the tree rebuilds when the files change.
    const index = useMemo(() => indexNodes(nodes), [nodes]);
    const indexRef = useRef(index);
    // Cmd/Ctrl/Shift-click selects instead of opening.
    const modifierClick = useRef(false);

    const tree = useTree<WorkspaceNode>({
        rootItemId: ROOT,
        indent: INDENT,
        state: {expandedItems: expanded ?? NO_FOLDERS},
        setExpandedItems: update => {
            const current = useGUIState.getState().workspaceTreeOpen[projectId] ?? [];
            const next = typeof update === 'function' ? update(current) : update;
            useGUIState.setState(s => ({workspaceTreeOpen: {...s.workspaceTreeOpen, [projectId]: next}}));
        },
        getItemName: item => item.getItemData().name,
        isItemFolder: item => item.getItemData().kind === 'folder',
        dataLoader: {
            getItem: id => indexRef.current.nodes.get(pathOf(id)) ?? ROOT_NODE,
            getChildren: id => indexRef.current.children.get(pathOf(id)) ?? [],
        },
        onPrimaryAction: item => {
            if (!modifierClick.current && item.getItemData().kind !== 'folder') {
                DashNavigator.instance().navigateToPath(item.getItemData().path);
            }
        },
        // Folders are sorted by name, so a position between items only picks the folder to move into.
        canReorder: true,
        openOnDropDelay: 600,
        canDrop: (_items, target) => target.item.isFolder(),
        // Only the tree's own items move; links or files dragged in from elsewhere are not taken.
        canDragForeignDragObjectOver: () => false,
        canDropForeignDragObject: () => false,
        // The rounded row, not the full-width element around it.
        setDragImage: items => ({imgElement: items[0].getElement()?.firstElementChild ?? items[0].getElement()!, xOffset: 16, yOffset: 16}),
        onDrop: async (items, target) => {
            const folder = pathOf(target.item.getId());
            try {
                for (const item of items) {
                    const path = item.getItemData().path;
                    if (parentOf(path) !== folder) await moveEntry(path, joinPath(folder, baseName(path)));
                }
                if (folder) setFolderOpen(projectId, folder, true);
            } catch (e) {
                toast.error((e as Error).message);
            }
        },
        features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature, dragAndDropFeature],
    });

    useEffect(() => {
        indexRef.current = index;
        tree.rebuildTree();
    }, [tree, index]);

    const dragged = tree.getState().dnd?.draggedItems;
    const setModifierClick = (pressed: boolean) => {
        modifierClick.current = pressed;
    };
    const context: TreeContext = {currentPath, setModifierClick, isDragged: item => !!dragged?.some(d => d.getId() === item.getId())};

    return (
        <div {...tree.getContainerProps('Workspace')} className="px-2 pt-4 outline-none">
            <div className="flex items-center">
                <div className="min-w-0 flex-1"><SectionHeader label="Workspace" extended={true}/></div>
                <NewItemButton/>
            </div>
            <div className="flex flex-col gap-0.5">
                {tree.getRootItem().getChildren().map(item => <TreeItem key={item.getId()} item={item} context={context}/>)}
            </div>
            {/* No left offset, so the line starts at the row's indent and stays inside the sidebar's padding. */}
            <div style={tree.getDragLineStyle(-1, 0)} className="h-[1.4px] rounded-full bg-foreground"/>
        </div>
    );
}

interface TreeContext {
    currentPath: string | null;
    setModifierClick: (pressed: boolean) => void;
    isDragged: (item: ItemInstance<WorkspaceNode>) => boolean;
}

/** Each path's node and its children's ids, for the data loader. */
function indexNodes(roots: WorkspaceNode[]) {
    const nodes = new Map<string, WorkspaceNode>();
    const children = new Map<string, string[]>([['', roots.map(n => n.path)]]);
    const visit = (node: WorkspaceNode) => {
        nodes.set(node.path, node);
        if (node.children) {
            children.set(node.path, node.children.map(c => c.path));
            node.children.forEach(visit);
        }
    };
    roots.forEach(visit);
    return {nodes, children};
}

function NewItemButton() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger aria-label="New"
                                 className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
                <Plus className="h-3.5 w-3.5"/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <NewFileItems variant="dropdown" folder=""/>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * One row, rendered nested (children inside their folder) rather than as Headless Tree's flat list, so a folder's
 * children slide open and closed.
 */
function TreeItem({item, context}: { item: ItemInstance<WorkspaceNode>, context: TreeContext }) {
    const node = item.getItemData();
    const isFolder = item.isFolder();
    const isOpen = isFolder && item.isExpanded();
    const isCurrent = context.currentPath === node.path;
    // Subscribed, so a query's icon follows its view.
    useWorkspace(s => node.kind === 'query' ? viewOfQuery(s.files[node.path] ?? '') : undefined);
    const nav = DashNavigator.instance();

    const {onClick, ...props} = item.getProps();
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
                    {...props}
                    // Full width with the indent inside, as Headless Tree measures rows for the drag line and for moving
                    // out of a folder by dragging left.
                    className="group outline-none"
                    style={{paddingLeft: item.getItemMeta().level * INDENT}}
                    onClick={(e: React.MouseEvent) => {
                        const modified = e.metaKey || e.ctrlKey || e.shiftKey;
                        // A file opens through the primary action, and Cmd/Ctrl-click selects; the browser following the
                        // link would reload the app or open a tab. Middle-click still opens one.
                        if (!isFolder) e.preventDefault();
                        context.setModifierClick(modified);
                        onClick?.(e);
                        context.setModifierClick(false);
                    }}
                >
                    <div className={cn(
                        "flex h-8 items-center gap-1.5 rounded-md pr-2 text-sm select-none transition-colors group-focus-visible:ring-1 group-focus-visible:ring-ring",
                        isCurrent
                            ? "bg-accent font-medium text-foreground"
                            : item.isSelected()
                                ? "bg-accent/60 text-foreground"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        isFolder && item.isUnorderedDragTarget() && "bg-primary/10 text-foreground",
                        context.isDragged(item) && "opacity-40",
                    )}>
                    {isFolder ? (
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch">
                            <ChevronRight className={cn("h-3.5 w-5 shrink-0 transition-transform", isOpen && "rotate-90")}/>
                            {label}
                        </span>
                    ) : (
                        <a
                            href={nav.getUrlFromPath(node.path)}
                            // The row is what is dragged, not the link.
                            draggable={false}
                            tabIndex={-1}
                            aria-current={isCurrent ? "page" : undefined}
                            className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch pl-5"
                        >
                            {label}
                        </a>
                    )}
                    </div>
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
            <Expandable open={isOpen} className="flex flex-col gap-0.5">
                {item.getChildren().map(child => <TreeItem key={child.getId()} item={child} context={context}/>)}
            </Expandable>
        </div>
    );
}
