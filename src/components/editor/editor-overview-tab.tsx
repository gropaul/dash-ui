'use client';

import React, {useState} from "react";
import {H5} from "@/components/ui/typography";
import {useRelationsState} from "@/state/relations.state";
import {Button} from "@/components/ui/button";
import {Copy, LayoutDashboard, PencilLine, Plus, Sheet, Trash} from "lucide-react";
import {TreeExplorer} from "@/components/basics/files/tree-explorer";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {ContextMenuItem, ContextMenuLabel, ContextMenuSeparator} from "@/components/ui/context-menu";
import {RenameDialog} from "@/components/editor/rename-dialog";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {DeleteDialog} from "@/components/editor/delete-dialog";
import {RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getRelationIdFromSource, RelationSource} from "@/model/relation";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {MAIN_CONNECTION_ID} from "@/platform/global-data";
import {DashboardElement, DashboardState} from "@/model/dashboard-state";
import {toast} from "sonner";
import {DashboardCommand} from "@/components/editor/dashboard-command";


interface RenameState {
    isOpen: boolean;
    currentNode?: TreeNode;
    currentName?: string;
}

interface DeleteState {
    isOpen: boolean;
    currentNode?: TreeNode;
    title?: string;
    description?: string;
}

export interface DashboardCommandState {
    open: boolean;
    relation?: RelationState;
}

export function EditorOverviewTab() {

    const [renameState, setRenameState] = useState<RenameState>({isOpen: false});
    const [deleteState, setDeleteState] = useState<DeleteState>({isOpen: false});
    const [dashboardCommand, setDashboardCommand] = useState<DashboardCommandState>({open: false});

    const relations = useRelationsState((state) => state.relations);
    const dashboards = useRelationsState((state) => state.dashboards);
    const showRelation = useRelationsState((state) => state.showRelation);
    const showDashboard = useRelationsState((state) => state.showDashboard);
    const deleteRelation = useRelationsState((state) => state.deleteRelation);
    const deleteDashboard = useRelationsState((state) => state.deleteDashboard);
    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);
    const updateDashboardViewState = useRelationsState((state) => state.updateDashboardViewState);
    const addNewDashboard = useRelationsState((state) => state.addNewDashboard);
    const addNewRelation = useRelationsState((state) => state.addNewRelation);

    const relationTreeElements: TreeNode[] = Object.keys(relations).map<TreeNode>(relationStateId => {
        const relation = relations[relationStateId];
        return {
            id: relation.id,
            name: relation.viewState.displayName,
            type: 'relation',
            children: null,
            payload: relation
        };
    });

    const dashboardTreeElements: TreeNode[] = Object.keys(dashboards).map<TreeNode>(dashboardStateId => {
        const dashboard = dashboards[dashboardStateId];
        return {
            id: dashboard.id,
            name: dashboard.viewState.displayName,
            type: 'dashboard',
            children: null,
            payload: dashboard
        };
    });

    const rootElement: TreeNode = {
        type: 'folder',
        id: 'root',
        name: 'Examples',
        children: []
    }

    const treeElements = [rootElement]
        .concat(dashboardTreeElements)
        .concat(relationTreeElements);

    function onTreeElementClick(_path: string[], node: TreeNode) {
        if (node.type === 'relation') {
            showRelation(node.payload);
        } else if (node.type === 'dashboard') {
            showDashboard(node.payload);
        }
    }

    function onRename(tree: TreeNode) {
        let displayName = tree.name;
        if (tree.type === 'relation' || tree.type === 'dashboard') {
            displayName = tree.payload.viewState.displayName;
        }

        setRenameState({
            isOpen: true,
            currentNode: tree,
            currentName: displayName
        });
    }

    function onRenameConfirmed(newName: string) {
        if (renameState.currentNode?.type === 'relation') {
            updateRelationViewState(renameState.currentNode.payload.id, {
                displayName: newName
            })
        } else if (renameState.currentNode?.type === 'dashboard') {
            updateDashboardViewState(renameState.currentNode.payload.id, {
                displayName: newName
            })
        }
    }

    function onDelete(tree: TreeNode) {
        if (tree.type === 'relation') {
            setDeleteState({
                isOpen: true,
                currentNode: tree,
                title: 'Delete Data View',
                description: `Are you sure you want to delete the data view "${tree.payload.viewState.displayName}"? This action cannot be undone.`
            });
            return;
        } else if (tree.type === 'dashboard') {
            setDeleteState({
                isOpen: true,
                currentNode: tree,
                title: 'Delete Dashboard',
                description: `Are you sure you want to delete the dashboard "${tree.payload.viewState.displayName}"? This action cannot be undone.`
            });
            return;
        }
    }

    function onDeleteConfirmed() {
        if (deleteState.currentNode?.type === 'relation') {
            deleteRelation(deleteState.currentNode.payload.id);
        } else if (deleteState.currentNode?.type === 'dashboard') {
            deleteDashboard(deleteState.currentNode.payload.id);
        }
    }

    function onDuplicate(tree: TreeNode) {
        if (tree.type === 'relation') {
            const relation = tree.payload as RelationState;
            const newSource: RelationSource = {
                type: 'query',
                id: getRandomId(),
                name: 'New Query',
                baseQuery: relation.query.baseQuery
            };
            const newRelation: RelationState = {
                ...relation,
                id: getRelationIdFromSource(relation.connectionId, newSource),
                name: relation.name + ' (Copy)',
                viewState: {
                    ...relation.viewState,
                    displayName: relation.viewState.displayName + ' (Copy)'
                },
                source: newSource
            }
            showRelation(newRelation);
        } else if (tree.type === 'dashboard') {
            const dashboard = tree.payload;
            const newDashboard = {
                ...dashboard,
                id: `dashboard-${getRandomId()}`,
                name: dashboard.name + ' (Copy)',
                viewState: {
                    ...dashboard.viewState,
                    displayName: dashboard.viewState.displayName + ' (Copy)'
                }
            }
            showDashboard(newDashboard);
        }
    }

    function onAddToDashboard(tree: TreeNode) {
        if (tree.type === 'relation') {
            setDashboardCommand({
                open: true,
                relation: tree.payload as RelationState
            });
            console.log('Add to dashboard', tree.payload);
        }
    }

    function onAddToDashboardSelected(relation: RelationState, dashboard: DashboardState) {
        console.log('Add to dashboard selected', relation, dashboard);
        const newElement: DashboardElement = {
            type: 'data',
            subtype: 'data-table',
            id: getRandomId(),
            data: relation
        }

        const currentElements = {...dashboard.elements};
        currentElements[newElement.id] = newElement;

        const addElement = useRelationsState.getState().addDashboardElement;
        addElement(dashboard.id, newElement);

        toast.success(`Added "${relation.viewState.displayName}" to "${dashboard.viewState.displayName}"`, {duration: 2000});

    }

    // show a list of the tables, have a light grey background
    return (

        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="p-4 pt-3 pb-2 pr-3 flex flex-row items-center justify-between">
                <H5 className="text-primary text-nowrap">Editor</H5>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={'ghost'} size={'icon'} className={'h-8 w-8'}>
                                <Plus size={16}/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => addNewRelation(MAIN_CONNECTION_ID)}>
                                <Sheet size={16} className="mr-2"/>
                                <span>New Query</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addNewDashboard(MAIN_CONNECTION_ID)}>
                                <LayoutDashboard size={16} className="mr-2"/>
                                <span>New Dashboard</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
            </div>
            <div className="overflow-y-auto h-full px-3">
                <TreeExplorer
                    tree={treeElements}
                    iconFactory={defaultIconFactory}
                    onClick={onTreeElementClick}
                    contextMenuFactory={(path, tree) => ContextMenuFactory(path, tree, onDelete, onRename, onDuplicate, onAddToDashboard)}
                />
            </div>
            <RenameDialog
                title={'Rename Data View'}
                description={'Enter a new name for the data view.'}
                isOpen={renameState.isOpen}
                onOpenChange={(isOpen) => setRenameState({...renameState, isOpen})}
                onRename={onRenameConfirmed}
                currentName={renameState.currentName || ''}
            />
            <DeleteDialog
                title={deleteState.title}
                description={deleteState.description}
                isOpen={deleteState.isOpen}
                onOpenChange={(isOpen) => setDeleteState({...deleteState, isOpen})}
                onDelete={onDeleteConfirmed}
            />
            <DashboardCommand
                dashboards={Object.values(dashboards)}
                open={dashboardCommand.open}
                setOpen={(open) => setDashboardCommand({...dashboardCommand, open})}
                onDashboardSelected={(d) => onAddToDashboardSelected(dashboardCommand.relation!, d)}
            />
        </div>
    )
}

function ContextMenuFactory(
    path: string[],
    tree: TreeNode,
    onDelete: (tree: TreeNode) => void,
    onRename: (tree: TreeNode) => void,
    onDuplicate: (tree: TreeNode) => void,
    onAddRelationToDashboard: (tree: TreeNode) => void
) {
    if (tree.type === 'folder') {
        return (
            <>
            </>
        );
    }
    return (
        <>
            <ContextMenuLabel className={'max-w-64 truncate text-left'}>
                {tree.name}
            </ContextMenuLabel>
            <ContextMenuSeparator/>
            <ContextMenuItem onClick={() => onRename(tree)}>
                <PencilLine size={16} className="mr-2"/>
                <span>Rename</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete(tree)}>
                <Trash size={16} className="mr-2"/>
                <span>Delete</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDuplicate(tree)}>
                <Copy size={16} className="mr-2"/>
                <span>Duplicate</span>
            </ContextMenuItem>

            { tree.type === 'relation' && (
                <>
                    <ContextMenuSeparator/>
                    <ContextMenuItem onClick={() => onAddRelationToDashboard(tree)}>
                        <LayoutDashboard size={16} className="mr-2"/>
                        <span>Add to Dashboard</span>
                    </ContextMenuItem>
                </>
            )}
        </>
    );
}
