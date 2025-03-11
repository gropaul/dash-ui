'use client';

import React, {useEffect, useState} from "react";
import {H5} from "@/components/ui/typography";
import {useRelationsState} from "@/state/relations.state";
import {Button} from "@/components/ui/button";
import {Folder, LayoutDashboard, Plus, Sheet} from "lucide-react";
import {TreeExplorer} from "@/components/basics/files/tree-explorer";
import {IterateAll, TreeActionUpdate, TreeNode} from "@/components/basics/files/tree-utils";
import {RenameDialog} from "@/components/workbench/rename-dialog";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {DeleteDialog} from "@/components/workbench/delete-dialog";
import {RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getRelationIdFromSource, RelationSource} from "@/model/relation";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {DEFAULT_STATE_STORAGE_DESTINATION, MAIN_CONNECTION_ID} from "@/platform/global-data";
import {toast} from "sonner";
import {DashboardCommand} from "@/components/workbench/dashboard-command";
import {DashboardState} from "@/model/dashboard-state";
import {RELATION_BLOCK_TYPE, RelationBlockData} from "@/components/editor/tools/relation.tool";
import {useEditorStore} from "@/state/editor.state";
import {ContextMenuFactory} from "@/components/workbench/editor-overview/context-menu-factory";
import {AddFolderActions} from "@/components/basics/files/tree-action-utils";
import {StateStorageInfo} from "@/model/database-connection";
import {GetStateStorageStatus} from "@/state/persistency/duckdb";
import {ConnectionsService} from "@/state/connections-service";
import {Badge} from "@/components/ui/badge";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";


interface RenameState {
    title?: string;
    description?: string;
    isOpen: boolean;
    path?: string[];
    currentNode?: TreeNode;
    currentName?: string;
}

interface DeleteState {
    isOpen: boolean;
    path?: string[];
    currentNode?: TreeNode;
    title?: string;
    description?: string;
}

export interface DashboardCommandState {
    open: boolean;
    relation?: RelationState;
}

export function EditorOverviewTab() {

    const [storageInfo, setStorageInfo] = useState<StateStorageInfo | null>(null);
    const [renameState, setRenameState] = useState<RenameState>({isOpen: false});
    const [deleteState, setDeleteState] = useState<DeleteState>({isOpen: false});
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[][]>([]);
    const [dashboardCommand, setDashboardCommand] = useState<DashboardCommandState>({open: false});

    const relations = useRelationsState((state) => state.relations);
    const dashboards = useRelationsState((state) => state.dashboards);
    const editorElements = useRelationsState((state) => state.editorElements);

    const showRelationFromId = useRelationsState((state) => state.showRelationFromId);
    const deleteRelation = useRelationsState((state) => state.deleteRelation);
    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);
    const addNewRelation = useRelationsState((state) => state.addNewRelation);

    const updateDashboardViewState = useRelationsState((state) => state.updateDashboardViewState);
    const showDashboardFromId = useRelationsState((state) => state.showDashboardFromId);
    const addNewDashboard = useRelationsState((state) => state.addNewDashboard);
    const setDashboardStateUnsafe = useRelationsState((state) => state.setDashboardStateUnsafe);
    const deleteDashboard = useRelationsState((state) => state.deleteDashboard);

    const updateEditorElements = useRelationsState((state) => state.updateEditorElements);
    const removeEditorElement = useRelationsState((state) => state.removeEditorElement);
    const applyEditorElementsActions = useRelationsState((state) => state.applyEditorElementsActions);
    const resetEditorElements = useRelationsState((state) => state.resetEditorElements);

    useEffect(() => {
        GetStateStorageStatus(DEFAULT_STATE_STORAGE_DESTINATION, ConnectionsService.getInstance().getDatabaseConnection()).then((info) => {
            setStorageInfo(info);
            console.log('Storage Info', info);
        });
    }, []);

    function onTreeElementPointerDown(path: string[], node: TreeNode, event: React.MouseEvent) {
        // if shift is pressed, add to the selection, otherwise set the selection
        if (event.shiftKey) {
            // if path is already selected, remove it, else add it
            if (selectedNodeIds.some((p) => p.join() === path.join())) {
                setSelectedNodeIds(selectedNodeIds.filter((p) => p.join() !== path.join()));
            } else {
                setSelectedNodeIds([...selectedNodeIds, path]);
            }

        } else {
            setSelectedNodeIds([path]);
        }
    }

    function onTreeElementClick(path: string[], node: TreeNode, event: React.MouseEvent) {
        // if shift is pressed, do not change the selection
        if (!event.shiftKey) {
            if (node.type === 'relation') {
                showRelationFromId(node.id, path);
            } else if (node.type === 'dashboard') {
                showDashboardFromId(node.id, path);
            }
        }
    }

    function onRename(path: string[], tree: TreeNode) {
        let displayName = tree.name;
        let title = 'Rename';
        let description = 'Enter a new name';
        if (tree.type === 'relation') {
            displayName = tree.name;
            title = 'Rename Data View';
            description = 'Enter a new name for the data view.';
        } else if (tree.type === 'dashboard') {
            displayName = tree.name;
            title = 'Rename Dashboard';
            description = 'Enter a new name for the dashboard.';
        } else if (tree.type === 'folder') {
            displayName = tree.name;
            title = 'Rename Folder';
            description = 'Enter a new name for the folder.';
        }

        setRenameState({
            title: title,
            description: description,
            path: path,
            isOpen: true,
            currentNode: tree,
            currentName: displayName
        });
    }

    function onRenameConfirmed(newName: string) {
        if (renameState.currentNode?.type === 'relation') {
            updateRelationViewState(renameState.currentNode.id, {
                displayName: newName
            }, renameState.path!);
        } else if (renameState.currentNode?.type === 'dashboard') {
            updateDashboardViewState(renameState.currentNode.id, {
                displayName: newName
            }, renameState.path!);
        } else if (renameState.currentNode?.type === 'folder') {
            const newFolder = {
                ...renameState.currentNode,
                name: newName
            }
            updateEditorElements(renameState.path!, newFolder);
        }
    }

    function onDelete(path: string[], tree: TreeNode) {

        const baseState = {
            path: path,
            isOpen: true,
            currentNode: tree,
        }

        if (tree.type === 'relation') {
            const relation = relations[tree.id];
            setDeleteState({
                ...baseState,
                title: 'Delete Data View',
                description: `Are you sure you want to delete the data view "${relation.viewState.displayName}"? This action cannot be undone.`
            });
            return;
        } else if (tree.type === 'dashboard') {
            const dashboard = dashboards[tree.id];
            setDeleteState({
                ...baseState,
                title: 'Delete Dashboard',
                description: `Are you sure you want to delete the dashboard "${dashboard.viewState.displayName}"? This action cannot be undone.`
            });
            return;
        } else if (tree.type === 'folder') {
            const dashboardNames: string[] = [];
            const relationNames: string[] = [];
            IterateAll([tree], (node) => {
                if (node.type === 'dashboard') {
                    dashboardNames.push(node.name);
                } else if (node.type === 'relation') {
                    relationNames.push(node.name);
                }
            });
            const description = `Are you sure you want to delete the folder "${tree.name}" and all its contents? This action cannot be undone. The folder contains ${dashboardNames.length} dashboards and ${relationNames.length} data views:
${dashboardNames.join(', ')}
${relationNames.join(', ')}`;
            setDeleteState({
                ...baseState,
                title: 'Delete Folder with Contents',
                description: description
            });
            return
        }
    }

    function onDeleteConfirmed() {
        if (deleteState.currentNode?.type === 'relation') {
            deleteRelation(deleteState.currentNode.id, deleteState.path!);
        } else if (deleteState.currentNode?.type === 'dashboard') {
            deleteDashboard(deleteState.currentNode.id, deleteState.path!);
        } else if (deleteState.currentNode?.type === 'folder') {
            removeEditorElement(deleteState.path!);
        }
    }

    function onDuplicate(path: string[], tree: TreeNode) {
        const parentPath = path.slice(0, path.length - 1);

        if (tree.type === 'relation') {
            const relation = relations[tree.id];
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
            // add the relation to the parent path
            addNewRelation(MAIN_CONNECTION_ID, parentPath, newRelation);
        } else if (tree.type === 'dashboard') {
            const dashboard = dashboards[tree.id];
            const newDashboard = {
                ...dashboard,
                id: `dashboard-${getRandomId()}`,
                name: dashboard.viewState.displayName + ' (Copy)',
                viewState: {
                    ...dashboard.viewState,
                    displayName: dashboard.viewState.displayName + ' (Copy)'
                }
            }
            addNewDashboard(MAIN_CONNECTION_ID, parentPath, newDashboard);
        }
    }

    function onAddToDashboard(path: string[], tree: TreeNode) {
        if (tree.type === 'relation') {
            const relation = relations[tree.id];
            setDashboardCommand({
                open: true,
                relation: relation
            });
        }
    }

    function onAddToDashboardSelected(relation: RelationState, dashboard: DashboardState) {
        // update relation ui
        relation.viewState.codeFenceState.layout = 'row';
        relation.viewState.codeFenceState.show = false;

        const newElementData: RelationBlockData = {
            ...relation,
            viewState: {
                ...relation.viewState,
                chartState: {
                    ...relation.viewState.chartState,
                    view: {
                        ...relation.viewState.chartState.view,
                        showConfig: false,
                    }
                },
                codeFenceState: {
                    sizePercentage: 0.5,
                    layout: 'row',
                    show: false
                }
            }
        }

        const newState: DashboardState = {
            ...dashboard,
            elementState: {
                blocks: [
                    ...(dashboard.elementState?.blocks || []),
                    {
                        type: RELATION_BLOCK_TYPE,
                        data: newElementData,
                        id: getRandomId()
                    }
                ]
            }
        }

        const editorState = useEditorStore();
        const dashboardId = dashboard.id;
        // of there is a ref, update the editor
        if (editorState.hasEditor(dashboardId)) {
            const editor = editorState.getEditor(dashboardId);
            const nBlocks = editor.blocks.getBlocksCount();
            editor.blocks.insert(RELATION_BLOCK_TYPE, newElementData, undefined, nBlocks);
        } else {
            // we can use this here as we are not adding, deleting or renaming a dashboard
            setDashboardStateUnsafe(dashboard.id, newState);
        }
        toast.success(`Added "${relation.viewState.displayName}" to "${dashboard.viewState.displayName}"`, {duration: 2000});

    }

    function onAddNewRelation(path: string[], tree: TreeNode) {
        addNewRelation(MAIN_CONNECTION_ID, path, undefined);
    }

    function onAddNewDashboard(path: string[], tree: TreeNode) {
        addNewDashboard(MAIN_CONNECTION_ID, path, undefined);
    }

    function onAddNewFolder(path?: string[], tree?: TreeNode) {
        const actions = AddFolderActions(path || [], tree);
        applyEditorElementsActions(actions);
    }

    function onExpandChange(path: string[], tree: TreeNode, expanded: boolean) {
        const action: TreeActionUpdate = {
            id_path: path,
            node: {...tree, expanded: expanded},
            type: "update"
        }
        applyEditorElementsActions([action]);
    }

    // show a list of the tables, have a light grey background
    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="p-4 pt-3 pb-2 pr-3 flex flex-row items-center justify-between">
                <H5 className="text-primary text-nowrap flex flex-row space-x-1 items-center">Editor {
                    storageInfo?.databaseReadonly || storageInfo?.databaseStatus == 'temporary'? <>
                        <div className="w-1"/>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        style={{fontSize: 14}}
                                        className="h-6 flex items-center space-x-1 text-orange-400 border border-orange-300 px-1 font-semibold rounded-md cursor-pointer">
                                        {storageInfo?.databaseReadonly ? 'Read-Only' : 'Temporary'}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent style={{fontSize: 14}} className="bg-primary text-primary-foreground p-0.5 rounded-md">
                                    <p>The editor state is stored in the {storageInfo?.databaseReadonly ? 'Read-Only' : 'Temporary'} database.</p>
                                    <p>New Dashboards etc. will not be stored permanently.</p>
                                    <p>(Storage Destination = {storageInfo?.destination.databaseName}.{storageInfo?.destination.schemaName}.{storageInfo?.destination.tableName})</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </> : null
                }</H5>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant={'ghost'} size={'icon'} className={'h-8 w-8'}>
                            <Plus size={16}/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onAddNewFolder()}>
                            <Folder size={16} className="mr-2"/>
                            <span>New Folder</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addNewRelation(MAIN_CONNECTION_ID, [], undefined)}>
                            <Sheet size={16} className="mr-2"/>
                            <span>New Query</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addNewDashboard(MAIN_CONNECTION_ID, [], undefined)}>
                            <LayoutDashboard size={16} className="mr-2"/>
                            <span>New Dashboard</span>
                        </DropdownMenuItem>
                        { /* only in development */}
                        {process.env.NODE_ENV === 'development' && (
                            <DropdownMenuItem onClick={() => resetEditorElements()}>
                                <span>Reset Editor</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="overflow-y-auto h-full px-3">
                <TreeExplorer
                    selectedIds={selectedNodeIds}
                    orderBy={OrderFolder}
                    tree={editorElements}
                    iconFactory={defaultIconFactory}
                    onPointerDown={onTreeElementPointerDown}
                    onClick={onTreeElementClick}
                    onExpandedChange={onExpandChange}
                    contextMenuFactory={(path, tree) => ContextMenuFactory(path, tree, onDelete, onRename, onDuplicate, onAddToDashboard, onAddNewRelation, onAddNewDashboard, onAddNewFolder)}
                />
            </div>
            <RenameDialog
                title={renameState.title || 'Rename'}
                description={renameState.description}
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


function OrderFolder(a: TreeNode, b: TreeNode) {
    // if same type, order by name
    if (a.type === b.type) {
        return a.name.localeCompare(b.name);
    } else {
        // folders first, then dashboards, then relations
        const type_a = a.type;
        const type_b = b.type;

        if (type_a === 'folder') { // always first
            return -1;
        } else {
            if (type_b === 'folder') { // always last
                return 1;
            } else { // now check for dashboards vs relations
                if (type_a === 'dashboard') {
                    return -1;
                } else {
                    return 1;
                }
            }
        }
    }
}
