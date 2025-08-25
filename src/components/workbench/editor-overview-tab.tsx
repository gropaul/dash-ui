'use client';

import React, {useEffect, useState} from "react";
import {useRelationsState} from "@/state/relations.state";
import {Button} from "@/components/ui/button";
import {Folder, LayoutDashboard, Plus, Sheet, Workflow} from "lucide-react";
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
import {RelationBlockData} from "@/components/editor/tools/relation.tool";
import {useEditorStore} from "@/state/editor.state";
import {ContextMenuFactory} from "@/components/workbench/editor-overview/context-menu-factory";
import {AddFolderActions} from "@/components/basics/files/tree-action-utils";
import {DefaultStateStorageInfo, StateStorageInfo} from "@/model/database-connection";
import {GetStateStorageStatus} from "@/state/persistency/duckdb-storage";
import {ConnectionsService} from "@/state/connections/connections-service";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {RELATION_BLOCK_NAME} from "@/components/editor/tool-names";
import {GetEntityTypeDisplayName, IsEntityType, RelationZustandEntityType} from "@/state/relations/entity-functions";


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

interface EditorOverviewTabProps {
    onEntityOpen?: () => void;
}

export function EditorOverviewTab(props: EditorOverviewTabProps = {}) {

    const [storageInfo, setStorageInfo] = useState<StateStorageInfo>(DefaultStateStorageInfo());
    const [renameState, setRenameState] = useState<RenameState>({isOpen: false});
    const [deleteState, setDeleteState] = useState<DeleteState>({isOpen: false});
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[][]>([]);
    const [dashboardCommand, setDashboardCommand] = useState<DashboardCommandState>({open: false});

    const relations = useRelationsState((state) => state.relations);
    const dashboards = useRelationsState((state) => state.dashboards);
    const editorElements = useRelationsState((state) => state.editorElements);

    const addNewRelation = useRelationsState((state) => state.addNewRelation);

    const addNewDashboard = useRelationsState((state) => state.addNewDashboard);
    const setDashboardStateUnsafe = useRelationsState((state) => state.setDashboardStateUnsafe);

    const updateEditorElements = useRelationsState((state) => state.updateEditorElements);
    const removeEditorElement = useRelationsState((state) => state.removeEditorElement);
    const applyEditorElementsActions = useRelationsState((state) => state.applyEditorElementsActions);
    const resetEditorElements = useRelationsState((state) => state.resetEditorElements);

    const addNewWorkflow = useRelationsState((state) => state.addNewWorkflow);

    const deleteEntity = useRelationsState((state) => state.deleteEntity);
    const getEntityDisplayName = useRelationsState((state) => state.getEntityDisplayName);
    const setEntityDisplayName = useRelationsState((state) => state.setEntityDisplayName);
    const showEntityFromId = useRelationsState((state) => state.showEntityFromId);

    useEffect(() => {
        let cancelled = false;

        const waitForConnectionAndFetch = async () => {
            while (!cancelled) {
                const service = ConnectionsService.getInstance();
                if (service.hasDatabaseConnection()) {
                    if (!cancelled) {
                        setStorageInfo(service.getDatabaseConnection().storageInfo);
                    }
                    break; // Exit the loop once info is fetched
                }
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        };

        waitForConnectionAndFetch();

        return () => {
            cancelled = true;
        };
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
        // if shift is pressed, we want to add elements to the selection not
        // open the element
        if (!event.shiftKey) {
            // assert that node.type is an entity type
            if (IsEntityType(node.type)) {
                showEntityFromId(node.type, node.id, path);
                props.onEntityOpen?.();
            } else {
                throw new Error(`Unknown node type: ${node.type}`);
            }

        }
    }

    function onRename(path: string[], tree: TreeNode) {
        let displayName = tree.name;
        let title = 'Rename';
        let description = 'Enter a new name';


        const type = tree.type;

        if (IsEntityType(type)) {
            const typeDisplayName = GetEntityTypeDisplayName(type);
            displayName = getEntityDisplayName( type, tree.id,);
            title = `Rename ${typeDisplayName}`;
            description = `Enter a new name for the ${typeDisplayName.toLowerCase()} "${displayName}".`;
        } else if (type === 'folder') {
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
        if (!renameState.currentNode) {
            return;
        }

        const type = renameState.currentNode.type;
        if (IsEntityType(type)) {

            setEntityDisplayName(type, renameState.currentNode.id,  newName, renameState.path!);
        } else if (type === 'folder') {
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


        const type = tree.type;

        if (IsEntityType(type)) {
            const typeDisplayName = GetEntityTypeDisplayName(type);
            const displayName = getEntityDisplayName( type, tree.id,);
            setDeleteState({
                ...baseState,
                title: 'Delete ' + typeDisplayName + ' ?',
                description: `Are you sure you want to delete the ${typeDisplayName.toLowerCase()} "${displayName}"? This action cannot be undone.`
            });
        } else if (tree.type === 'folder') {
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
            setDeleteState({
                ...baseState,
                title: 'Delete Folder with Contents',
                description: description
            });
            return
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
                        type: RELATION_BLOCK_NAME,
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
            const nBlocks = editor.editor.blocks.getBlocksCount();
            editor.editor.blocks.insert(RELATION_BLOCK_NAME, newElementData, undefined, nBlocks);
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
            <div className="p-4 pt-2.5 pb-2 pr-3 flex flex-row items-center justify-between  overflow-hidden">
                <div className="text-primary text-nowrap flex flex-row space-x-1 items-center font-bold">Editor {
                    storageInfo.state === 'loaded' && storageInfo.databaseStatus == 'temporary'? <>
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
                }</div>
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
                        <DropdownMenuItem onClick={() => addNewWorkflow()}>
                            <Workflow size={16} className="mr-2"/>
                            <span>New Workflow (dev)</span>
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
