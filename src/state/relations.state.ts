import {getRelationIdFromSource, RelationSource} from "@/model/relation";
import {
    executeQueryOfRelation,
    getInitialParams,
    getRelationStateFromSource,
    RelationState,
} from "@/model/relation-state";
import {RelationViewState} from "@/model/relation-view-state";
import {SchemaState} from "@/model/schema-state";
import {DatabaseState} from "@/model/database-state";
import {DeepPartial} from "@/platform/object-utils";
import {persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {DashboardState, getInitDashboardViewState} from "@/model/dashboard-state";
import {getRandomId} from "@/platform/id-utils";
import {EditorFolder} from "@/model/editor-folder";
import {
    addNode,
    applyTreeActions,
    copyAndApplyTreeActions,
    findNodeInTrees,
    findPathById,
    IterateAll,
    removeNode,
    TreeAction,
    updateNode
} from "@/components/basics/files/tree-utils";
import {AddEntityActions, RemoveNodeAction, RenameNodeActions} from "@/components/basics/files/tree-action-utils";
import {useGUIState} from "@/state/gui.state";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";
import {InitializeStorage} from "@/state/persistency/api";
import {GetInitialWorkflowState, WorkflowState} from "@/model/workflow-state";
import {
    AddIfNotExists,
    deleteFromEntityCollection,
    getEntityCollection,
    GetEntityDisplayNameById,
    GetEntityId,
    RelationZustandEntity,
    RelationZustandEntityType,
    SetEntityDisplayName
} from "@/state/entities/entity-functions";
import {useInitState} from "@/state/init.state";
import {useRelationDataState} from "@/state/relations-data.state";
import {isInteractiveBlock} from "@/components/editor/inputs/input-manager";
import {RelationEvents} from "@/state/relations/event/relation-events";
// Side-effect import: initializes macro registration subscription
// Do not remove - required for table macros to work
import "@/state/relations/sql/table-macros";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationActions} from "@/state/relations/actions/static-actions";


export interface RelationZustand {
    editorElements: EditorFolder[];
    relations: { [key: string]: RelationState };
    schemas: { [key: string]: SchemaState };
    databases: { [key: string]: DatabaseState };
    dashboards: { [key: string]: DashboardState };
    workflows: { [key: string]: WorkflowState };
}

export interface DefaultRelationZustandActions {
    // the ID of a relation may never be updated!
    updateRelation: (newRelation: RelationState) => void,
}

interface RelationZustandActions extends DefaultRelationZustandActions {
    mergeState: (state: RelationZustand, openDashboards: boolean) => void,
    /* relation actions */
    addNewRelation: (connectionId: string, editorPath: string[], relation: RelationState) => void,
    relationExists: (relationId: string) => boolean,
    showRelationFromSource: (connectionId: string, source: RelationSource, editorPath: string[]) => void,

    /* relation data actions */
    getRelation: (relationId: string) => RelationState | undefined,

    /* schema actions */
    getSchemaState: (schemaId: string) => SchemaState,

    /* database actions */
    getDatabaseState: (databaseId: string) => DatabaseState,

    /* dashboard actions */
    addNewDashboard: (connectionId: string, editorPath: string[], dashboard?: DashboardState) => void,
    getDashboardState: (dashboardId: string) => DashboardState,
    // **unsafe in terms of adding, renaming, and deleting dashboards**
    setDashboardStateUnsafe: (dashboardId: string, dashboard: DashboardState) => void,

    /* workflow actions */
    addNewWorkflow: (workflow?: WorkflowState, editorPath?: string[]) => void,
    getWorkflowState: (workflowId: string) => WorkflowState,
    updateWorkflowState: (workflowId: string, workflow: Partial<WorkflowState>) => void,

    /* entity actions */
    deleteEntity: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => void,
    getEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string) => string,
    setEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string, displayName: string, path: string[]) => void,
    showEntity(entityType: RelationZustandEntityType, entity: RelationZustandEntity, path: string[]) : void,
    showEntityFromId: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => void,

    /* editor folder actions */
    updateEditorElements: (path: string[], newFolder: EditorFolder) => void,
    addEditorElement: (path: string[], newFolder: EditorFolder) => void,
    removeEditorElement: (path: string[]) => void,
    applyEditorElementsActions: (actions: TreeAction[]) => void,
    resetEditorElements: () => void,

    /* persistence actions */
    manualPersistModel: () => void,

    /* tab actions */
    closeTab: (tabId: string) => void,
}

export type RelationZustandCombined = RelationZustand & RelationZustandActions;

interface RelationsHydrationState {
    hasDuckDBStorage: boolean;
    setHasDuckDBStorage: (hasDuckDBStorage: boolean) => void;
}

export const useRelationsHydrationState = createWithEqualityFn<RelationsHydrationState>(
    (set, get) => ({
        hasDuckDBStorage: false,
        setHasDuckDBStorage: (hasDuckDBStorage: boolean) => set({hasDuckDBStorage}),
    }),
);

export const INIT: RelationZustand = {
    relations: {},
    schemas: {},
    databases: {},
    dashboards: {},
    workflows: {},
    editorElements: [],
};

interface RelationsStateStorageState {
    isDuckDBStorage: boolean;
    setIsDuckDBStorage: (isDuckDBStorage: boolean) => void;
}

export const useRelationsState = createWithEqualityFn(
    persist<RelationZustandCombined>(
        (set, get) =>
            ({
                ...INIT,
                mergeState(newState: RelationZustand, openDashboards: boolean = false) {
                    const {relations, schemas, databases, dashboards, editorElements} = newState;

                    // Check for duplicates before merging
                    set((oldState) => {
                        const newRelations = {...relations};
                        const newSchemas = {...schemas};
                        const newDatabases = {...databases};
                        const newDashboards = {...dashboards};
                        const newElements = [...editorElements];

                        // Remove any items that already exist in the current state
                        Object.keys(relations).forEach(id => {
                            if (oldState.relations[id]) delete newRelations[id];
                        });
                        Object.keys(schemas).forEach(id => {
                            if (oldState.schemas[id]) delete newSchemas[id];
                        });
                        Object.keys(databases).forEach(id => {
                            if (oldState.databases[id]) delete newDatabases[id];
                        });
                        Object.keys(dashboards).forEach(id => {
                            if (oldState.dashboards[id]) delete newDashboards[id];
                        });

                        // Filter out editor elements that might already exist
                        const existingElementIds = new Set(oldState.editorElements.map(el => el.id));
                        const uniqueNewElements = newElements.filter(el => !existingElementIds.has(el.id));

                        return {
                            ...oldState,
                            relations: {...oldState.relations, ...newRelations},
                            schemas: {...oldState.schemas, ...newSchemas},
                            databases: {...oldState.databases, ...newDatabases},
                            dashboards: {...oldState.dashboards, ...newDashboards},
                            editorElements: [...oldState.editorElements, ...uniqueNewElements],
                        };
                    });

                    // Register macros for newly merged relations
                    Object.values(relations).forEach((relation) => {
                        RelationEvents.create(relation);
                    });

                    if (openDashboards) {
                        // open all dashboards in the GUI
                        Object.values(dashboards).forEach((dashboard) => {
                            this.showEntity('dashboards', dashboard, []);
                        });
                    }
                },

                addNewWorkflow: (workflow?: WorkflowState, editorPath?: string[]) => {
                    const local_workflow = workflow ?? GetInitialWorkflowState();
                    const local_editorPath = editorPath ?? [];
                    get().showEntity('workflows', local_workflow, local_editorPath);
                },
                getWorkflowState: (workflowId: string) => {
                    const workflow = get().workflows[workflowId];
                    if (!workflow) {
                        throw new Error(`Workflow with id ${workflowId} not found`);
                    }
                    return workflow;
                },
                updateWorkflowState: (workflowId: string, updates: Partial<WorkflowState>) => {
                    set((state) => ({
                        workflows: {
                            ...state.workflows,
                            [workflowId]: {
                                ...state.workflows[workflowId],
                                ...updates,
                            },
                        },
                    }));
                },

                deleteEntity: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => {
                    if (useGUIState.getState().isTabOpen(entityId)) {
                        useGUIState.getState().removeTab(entityId);
                    }

                    // if it is a relation we have to delete the cache and dispatch delete action
                    if (entityType === 'relations') {
                        useRelationDataState.getState().deleteData(entityId);
                        const relation = get().relations[entityId];
                        if (relation) {
                            RelationEvents.delete(relation);
                        }
                    }
                    // if it is a dashboard, we have to delete the blocks' cache as well
                    if (entityType === 'dashboards') {
                        const dashboard = get().dashboards[entityId];
                        dashboard.elementState?.blocks.forEach((block) => {
                            if (isInteractiveBlock(block.type)) {
                                const relationId = block.data.id;
                                useRelationDataState.getState().deleteData(relationId);
                            }
                        })
                    }
                    const newCollection = deleteFromEntityCollection(get(), entityType, entityId);
                    const actions = RemoveNodeAction(editorPath);
                    const newElements = copyAndApplyTreeActions(get().editorElements, actions);
                    set({
                        [entityType]: newCollection,
                        editorElements: newElements,
                    });
                },

                getEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string): string => {
                    return GetEntityDisplayNameById(entityId, entityType, get());
                },

                setEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string, displayName: string, path: string[]) => {
                    // Dispatch rename action for macro re-registration
                    if (entityType === 'relations') {
                        const relation = get().relations[entityId];
                        if (relation) {
                            const renamedRelation = {
                                ...relation,
                                viewState: { ...relation.viewState, displayName },
                            };
                            RelationEvents.rename(relation, renamedRelation);
                        }
                    }

                    const newEntity = SetEntityDisplayName(entityId, entityType, displayName, get());
                    useGUIState.getState().renameTab(entityId, displayName);

                    // If path is empty, find the path by entity ID
                    const effectivePath = path.length > 0 ? path : findPathById(get().editorElements, entityId);
                    if (effectivePath) {
                        const node = findNodeInTrees(get().editorElements, effectivePath);
                        const actions = RenameNodeActions(effectivePath, displayName, node!);
                        const newEditorElements = copyAndApplyTreeActions(get().editorElements, actions);
                        set((state) => ({
                            [entityType]: {
                                ...state[entityType],
                                [entityId]: newEntity,
                            },
                            editorElements: newEditorElements,
                        }));
                    } else {
                        // No path found, just update the entity without editor elements
                        set((state) => ({
                            [entityType]: {
                                ...state[entityType],
                                [entityId]: newEntity,
                            },
                        }));
                    }
                },

                showEntity(entityType: RelationZustandEntityType, entity: RelationZustandEntity, editorPath: string[] = []) {


                    const addResult = AddIfNotExists(entity, entityType, get(), editorPath);
                    const entityId = GetEntityId(entity);
                    if (addResult.added) {
                        set((state) => ({
                            [entityType]: addResult.updatedCollection,
                            editorElements: addResult.updatedElements,
                        }));
                    }

                    if (useGUIState.getState().isTabOpen(entityId)) {
                        useGUIState.getState().focusTab(entityId);
                    } else {
                        useGUIState.getState().addEntityTab(entityType, entity);
                    }
                },

                showEntityFromId: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => {
                    const collection = getEntityCollection(get(), entityType);
                    const entity = collection[entityId];
                    if (!entity) {
                        throw new Error(`Entity with id ${entityId} not found in ${entityType} collection`);
                    }
                    get().showEntity(entityType, entity, editorPath);
                },

                addNewDashboard: async (connectionId: string, editorPath: string[], dashboard?: DashboardState) => {
                    let local_dashboard: DashboardState | undefined = dashboard;
                    if (!local_dashboard) {
                        const randomId = `dashboard-${getRandomId()}`;
                        local_dashboard = {
                            id: randomId,
                            name: "New Dashboard",
                            viewState: getInitDashboardViewState("New Dashboard"),
                            elementState: {
                                blocks: [{
                                    id: getRandomId(),
                                    type: "header",
                                    data: {
                                        "text": "New Dashboard",
                                        "level": 1
                                    }
                                }]
                            }
                        }
                    }
                    get().showEntity('dashboards', local_dashboard, editorPath);
                },

                addNewRelation: async (connectionId: string, editorPath: string[], relation: RelationState) => {
                    // make sure that this relation is not already in the state
                    get().showEntity('relations', relation, editorPath);
                },

                setDashboardStateUnsafe: (dashboardId: string, dashboard: DashboardState) => {
                    set((state) => ({
                        dashboards: {
                            ...state.dashboards,
                            [dashboardId]: dashboard,
                        },
                    }));
                },
                getDashboardState: (dashboardId: string) => {
                    return get().dashboards[dashboardId];
                },
                getDatabaseState: (databaseId: string) => {
                    return get().databases[databaseId];
                },
                getSchemaState: (schemaId: string) => {
                    return get().schemas[schemaId];
                },

                relationExists: (relationId: string) => get().relations[relationId] !== undefined,
                getRelation: (relationId: string) => get().relations[relationId],

                showRelationFromSource: async (connectionId: string, source: RelationSource, editorPath: string[]) => {

                    const relationId = getRelationIdFromSource(connectionId, source);
                    // check if relation already exists
                    const existingRelation = get().relations[relationId];
                    if (existingRelation) {
                        get().showEntity('relations', existingRelation, editorPath);
                    } else {
                        const relationState = RelationActions.create(source);
                        const actions = getRelationActions({relationState, updateRelation: get().updateRelation});
                        get().showEntity('relations', relationState, editorPath);
                        await actions.updateRelationDataWithBaseQuery(relationState.query.baseQuery);
                    }
                },

                updateRelation: (newRelation: RelationState) => {
                    // Note: RelationActions dispatch is handled by useRelationActions hook
                    // to work uniformly across standalone, workflow, and dashboard contexts.
                    console.log(newRelation);
                    set((state) => ({
                        relations: {
                            ...state.relations,
                            [newRelation.id]: newRelation,
                        },
                    }));
                },
                closeTab: (tabId: string) => {
                    const {schemas, databases, relations, dashboards} = get();

                    if (schemas[tabId]) {
                        const newSchemas = {...schemas};
                        delete newSchemas[tabId];
                        set({schemas: newSchemas});
                    } else if (databases[tabId]) {
                        const newDatabases = {...databases};
                        delete newDatabases[tabId];
                        set({databases: newDatabases});
                    } else if (relations[tabId]) {
                        const newRelations = {...relations};
                        set({relations: newRelations});
                    } else if (dashboards[tabId]) {
                        const newDashboards = {...dashboards};
                        set({dashboards: newDashboards});
                    }
                },

                updateEditorElements: (path: string[], newFolder: EditorFolder) => {
                    const newElements = [...get().editorElements];
                    const updatedFolders = updateNode(newElements, path, newFolder);
                    set(() => ({editorElements: updatedFolders}));
                },
                addEditorElement: (path: string[], newFolder: EditorFolder) => {
                    const newElements = [...get().editorElements];
                    const updatedFolders = addNode(newElements, path, newFolder);
                    set(() => ({editorElements: updatedFolders}));
                },

                removeEditorElement: (path: string[]) => {

                    const newElements = [...get().editorElements];
                    const newRelations = {...get().relations};
                    const newDashboards = {...get().dashboards};

                    const elementToRemove = findNodeInTrees(newElements, path);
                    if (!elementToRemove) throw new Error('Element to remove not found');

                    IterateAll([elementToRemove], (node) => {
                        if (node.type === 'dashboards') {
                            if (useGUIState.getState().isTabOpen(node.id)) {
                                useGUIState.getState().removeTab(node.id);
                            }
                            delete newDashboards[node.id];
                        } else if (node.type === 'relations') {
                            if (useGUIState.getState().isTabOpen(node.id)) {
                                useGUIState.getState().removeTab(node.id);
                            }
                            const relation = get().relations[node.id];
                            if (relation) {
                                RelationEvents.delete(relation);
                            }
                            delete newRelations[node.id];
                        }
                    });

                    const updatedFolders = removeNode(newElements, path);
                    set(() => ({
                        editorElements: updatedFolders,
                        relations: newRelations,
                        dashboards: newDashboards,
                    }));
                },

                applyEditorElementsActions: (actions: TreeAction[]) => {
                    const newElements = [...get().editorElements];
                    let updatedFolders = applyTreeActions(newElements, actions);
                    set(() => ({editorElements: updatedFolders}));
                },
                resetEditorElements: () => {
                    set(() => ({editorElements: []}));
                },

                manualPersistModel: () => {
                    set(() => ({}));
                },
            }),
        {
            name: DEFAULT_STATE_STORAGE_DESTINATION.tableName!,
            storage: InitializeStorage(),
            onRehydrateStorage: (state => {
                function callback(state: any, error: any) {
                    console.log("Rehydration of relations state completed.", {state, error});
                    if (error){
                        console.error(error)
                    }
                    if (state === undefined ){
                        // if the state is undefined, remove all tabs
                        useInitState.getState().onRelationStateLoadedFromConnection([])
                        return INIT;
                    }

                    const hasDuckDBStorage = useRelationsHydrationState.getState().hasDuckDBStorage
                    console.log('Has DuckDB Storage:', hasDuckDBStorage);
                    if (hasDuckDBStorage) {

                        // get the list of all possible open tabs
                        const ids = [];
                        // check if key is in the state
                        if (state.relations) {
                            for (const key in state.relations) {
                                ids.push(key);
                            }
                        }
                        if (state.schemas) {
                            for (const key in state.schemas) {
                                ids.push(key);
                            }
                        }
                        if (state.databases) {
                            for (const key in state.databases) {
                                ids.push(key);
                            }
                        }
                        if (state.dashboards) {
                            for (const key in state.dashboards) {
                                ids.push(key);
                            }
                        }

                        useInitState.getState().onRelationStateLoadedFromConnection(ids)
                    }
                }

                return callback;
            })
        }
    )
);