'use client';

import React, {useState} from "react";
import {toast} from "sonner";
import {useRelationsState} from "@/state/relations.state";
import {useRenameDialogStore} from "@/state/rename-dialog.state";
import {useRelationDeleteDialog} from "@/components/workbench/relation-delete-dialog";
import {DeleteDialog} from "@/components/workbench/delete-dialog";
import {findPathById, IterateAll, TreeNode} from "@/components/basics/files/tree-utils";
import {useGUIState, CommandActionType, CommandEntityType} from "@/state/gui.state";
import {RelationState} from "@/model/relation-state";
import {GetEntityTypeDisplayName, IsEntityType, RelationZustandEntityType} from "@/state/entities/entity-functions";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {cloneNodesForClipboard, cloneEdgesForClipboard} from "@/components/canvas/logic/clipboard-utils";
import {getRandomId} from "@/platform/id-utils";
import {MAIN_CONNECTION_ID} from "@/platform/global-data";
import {routeForNodeId, resolveNodeFromPath} from "@/state/routing/core-model";
import {navigateReplace, currentPathname} from "@/state/routing/navigation";

/** The per-row/per-node actions shared by the folder view and the editor sidebar. */
export interface EntityActionHandlers {
    onRename: (path: string[], tree: TreeNode) => void;
    onDelete: (path: string[], tree: TreeNode) => void;
    onDuplicate: (path: string[], tree: TreeNode) => void;
    onAddToDashboard: (path: string[], tree: TreeNode) => void;
    onAddToCanvas: (path: string[], tree: TreeNode) => void;
    onCopyLink: (path: string[], tree: TreeNode) => void;
    onMove: (path: string[], tree: TreeNode) => void;
}

interface DeleteState {
    isOpen: boolean;
    path?: string[];
    currentNode?: TreeNode;
    title?: string;
    description?: string;
}

/**
 * Single source of truth for entity actions (rename / duplicate / delete / add-to-dashboard /
 * add-to-canvas / copy-link) plus the dialogs those actions drive. Consumers spread `handlers`
 * into a menu factory and render `dialogs` once in their tree.
 */
export function useEntityActions(): { handlers: EntityActionHandlers; dialogs: React.ReactNode } {
    const relations = useRelationsState((state) => state.relations);
    const dashboards = useRelationsState((state) => state.dashboards);
    const canvas = useRelationsState((state) => state.canvas);

    const addNewRelation = useRelationsState((state) => state.addNewRelation);
    const addNewDashboard = useRelationsState((state) => state.addNewDashboard);
    const addNewCanvas = useRelationsState((state) => state.addNewCanvas);
    const deleteEntity = useRelationsState((state) => state.deleteEntity);
    const removeEditorElement = useRelationsState((state) => state.removeEditorElement);
    const getEntityDisplayName = useRelationsState((state) => state.getEntityDisplayName);
    const addRelationWidgetToDashboard = useRelationsState((state) => state.addRelationWidgetToDashboard);
    const addRelationToCanvas = useRelationsState((state) => state.addRelationToCanvas);
    const applyEditorElementsActions = useRelationsState((state) => state.applyEditorElementsActions);

    const [deleteState, setDeleteState] = useState<DeleteState>({isOpen: false});

    function onRename(path: string[], tree: TreeNode) {
        let displayName = tree.name;
        const type = tree.type;
        if (IsEntityType(type)) {
            displayName = getEntityDisplayName(type, tree.id);
        }
        useRenameDialogStore.getState().openRenameDialog({
            entityType: type as any,
            entityId: tree.id,
            currentName: displayName,
            path: path,
        });
    }

    function onDelete(path: string[], tree: TreeNode) {
        const type = tree.type;

        // Relations use the dependency-aware delete dialog
        if (type === 'relations') {
            const displayName = getEntityDisplayName(type, tree.id);
            useRelationDeleteDialog.getState().openForSidebarDelete(
                tree.id,
                displayName,
                () => deleteEntity('relations', tree.id, path),
            );
            return;
        }

        const baseState = {path, isOpen: true, currentNode: tree};

        if (IsEntityType(type)) {
            const typeDisplayName = GetEntityTypeDisplayName(type);
            const displayName = getEntityDisplayName(type, tree.id);
            setDeleteState({
                ...baseState,
                title: 'Delete ' + typeDisplayName + ' ?',
                description: `Are you sure you want to delete the ${typeDisplayName.toLowerCase()} "${displayName}"? This action cannot be undone.`,
            });
        } else if (type === 'folder') {
            const dashboardNames: string[] = [];
            const relationNames: string[] = [];
            IterateAll([tree], (node) => {
                if (node.type === 'dashboards') {
                    dashboardNames.push(node.name);
                } else if (node.type === 'relations') {
                    relationNames.push(node.name);
                }
            });
            const description = `Are you sure you want to delete the folder "${tree.name}" and all its contents? This action cannot be undone. The folder contains ${dashboardNames.length} dashboards and ${relationNames.length} data views:
${dashboardNames.join(', ')}
${relationNames.join(', ')}`;
            setDeleteState({...baseState, title: 'Delete Folder with Contents', description});
        }
    }

    function onDeleteConfirmed() {
        if (deleteState.currentNode?.type === 'folder') {
            removeEditorElement(deleteState.path!);
        } else {
            deleteEntity(deleteState.currentNode?.type as RelationZustandEntityType, deleteState.currentNode!.id, deleteState.path!);
        }
    }

    function onDuplicate(path: string[], tree: TreeNode) {
        const parentPath = path.slice(0, path.length - 1);

        if (tree.type === 'relations') {
            const copy = RelationActions.copy(relations[tree.id]);
            addNewRelation(MAIN_CONNECTION_ID, parentPath, copy);
        } else if (tree.type === 'dashboards') {
            const dashboard = dashboards[tree.id];
            const newName = dashboard.viewState.displayName + ' (Copy)';
            addNewDashboard(MAIN_CONNECTION_ID, parentPath, {
                ...dashboard,
                id: `dashboard-${getRandomId()}`,
                name: newName,
                viewState: {...dashboard.viewState, displayName: newName},
            });
        } else if (tree.type === 'canvas') {
            const canvasState = canvas[tree.id];
            const newName = canvasState.viewState.displayName + ' (Copy)';
            // The copy references the same relations (shared, not copied); clone the node/edge
            // objects so the two canvases keep independent layouts.
            addNewCanvas({
                ...canvasState,
                id: getRandomId(),
                viewState: {...canvasState.viewState, displayName: newName},
                nodes: cloneNodesForClipboard(canvasState.nodes),
                edges: cloneEdgesForClipboard(canvasState.edges),
            }, parentPath);
        }
    }

    // Open the palette as a target picker (dashboards/canvases) and add the relation to the choice.
    function openAddRelationTo(
        relation: RelationState,
        action: CommandActionType,
        targetKind: 'dashboards' | 'canvas',
        add: (targetId: string, relationId: string) => void,
    ) {
        useGUIState.getState().openCommand({
            action,
            filter: [targetKind as CommandEntityType],
            onSelect: (entity) => {
                add(entity.id, relation.id);
                const name = useRelationsState.getState()[targetKind][entity.id]?.viewState.displayName ?? targetKind;
                toast.success(`Added "${relation.viewState.displayName}" to "${name}"`, {duration: 2000});
            },
        });
    }

    function onAddToDashboard(path: string[], tree: TreeNode) {
        if (tree.type === 'relations') {
            openAddRelationTo(relations[tree.id], 'add-relation-to-dashboard', 'dashboards', addRelationWidgetToDashboard);
        }
    }

    function onAddToCanvas(path: string[], tree: TreeNode) {
        if (tree.type === 'relations') {
            openAddRelationTo(relations[tree.id], 'add-relation-to-canvas', 'canvas', addRelationToCanvas);
        }
    }

    function onCopyLink(path: string[], tree: TreeNode) {
        const route = routeForNodeId(useRelationsState.getState().editorElements, tree.id);
        if (!route) {
            toast.error("Could not build a link for this item");
            return;
        }
        const url = window.location.origin + route;
        navigator.clipboard.writeText(url).then(
            () => toast.success("Link copied to clipboard", {duration: 2000}),
            () => toast.error("Failed to copy link"),
        );
    }

    function onMove(path: string[], tree: TreeNode) {
        // Ids that can't be a destination: the item itself and its whole subtree (can't move into
        // yourself) plus its current parent (that move would be a no-op).
        const subtreeIds: string[] = [];
        IterateAll([tree], (node) => subtreeIds.push(node.id));
        const currentParentId = path.length >= 2 ? path[path.length - 2] : undefined;
        const excludeIds = currentParentId ? [...subtreeIds, currentParentId] : subtreeIds;

        const displayName = IsEntityType(tree.type) ? getEntityDisplayName(tree.type, tree.id) : tree.name;
        const moveTo = (targetPath: string[]) => {
            // Moving relocates the node (and everything under it), so routes change. Remember which
            // entity is on screen; if its route stops resolving after the move — whether it was the
            // moved item itself or a descendant of a moved folder — follow it to its new location.
            const shownId = resolveNodeFromPath(useRelationsState.getState().editorElements, currentPathname())?.id;
            applyEditorElementsActions([{type: 'move', id_path: path, target_id_path: targetPath}]);
            if (shownId) {
                const elements = useRelationsState.getState().editorElements;
                const stillResolves = resolveNodeFromPath(elements, currentPathname())?.id === shownId;
                if (!stillResolves) {
                    const newRoute = routeForNodeId(elements, shownId);
                    if (newRoute) navigateReplace(newRoute);
                }
            }
            toast.success(`Moved "${displayName}"`, {duration: 2000});
        };

        // Reuse the global command palette as a destination-folder picker (folders only, with the
        // workspace root pinned on top and full breadcrumb paths to disambiguate same-named folders).
        useGUIState.getState().openCommand({
            action: 'move',
            filter: ['folder'],
            excludeIds,
            showPaths: true,
            rootOption: {label: 'Workspace', onSelect: () => moveTo([])},
            onSelect: (entity) => {
                const targetPath = findPathById(useRelationsState.getState().editorElements, entity.id) ?? [];
                moveTo(targetPath);
            },
        });
    }

    const handlers: EntityActionHandlers = {
        onRename, onDelete, onDuplicate, onAddToDashboard, onAddToCanvas, onCopyLink, onMove,
    };

    const dialogs = (
        <DeleteDialog
            title={deleteState.title}
            description={deleteState.description}
            isOpen={deleteState.isOpen}
            onOpenChange={(isOpen) => setDeleteState({...deleteState, isOpen})}
            onDelete={onDeleteConfirmed}
        />
    );

    return {handlers, dialogs};
}
