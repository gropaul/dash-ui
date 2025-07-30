import {getRelationIdFromSource, RelationSource} from "@/model/relation";
import {
    executeQueryOfRelationState,
    getInitialParams,
    getViewFromSource,
    RelationState,
    returnEmptyErrorState,
    setRelationLoading,
    updateRelationQueryForParams,
    ViewQueryParameters,
} from "@/model/relation-state";
import {RelationViewState} from "@/model/relation-view-state";
import {DataSourceGroup} from "@/model/data-source-connection";
import {getSchemaId, SchemaState} from "@/model/schema-state";
import {DatabaseState, getDatabaseId} from "@/model/database-state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {DashboardState, DashboardViewState, getInitDashboardViewState} from "@/model/dashboard-state";
import {getRandomId} from "@/platform/id-utils";
import {EditorFolder} from "@/model/editor-folder";
import {
    addNode,
    applyTreeActions,
    copyAndApplyTreeActions,
    findNodeInTrees,
    findNodeParentInTrees,
    IterateAll,
    removeNode,
    TreeAction,
    updateNode
} from "@/components/basics/files/tree-utils";
import {
    AddEntityActions,
    RemoveNodeAction,
    RenameNodeActions
} from "@/components/basics/files/tree-action-utils";
import {useGUIState} from "@/state/gui.state";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";
import {InitializeStorage} from "@/state/persistency/api";
import {useSourceConState} from "@/state/connections-source.state";
import {maybeAttachDatabaseFromUrlParam} from "@/state/relations/attach-from-url-param";
import {GetInitialWorkflowState, GetWorkflowId, WorkflowState} from "@/model/workflow-state";
import {
    deleteFromEntityCollection, GetEntityDisplayName,
    GetEntityTypeDisplayName,
    RelationZustandEntityType, SetEntityDisplayName
} from "@/state/relations/entity-functions";


export interface RelationZustand {
    editorElements: EditorFolder[];
    relations: { [key: string]: RelationState };
    schemas: { [key: string]: SchemaState };
    databases: { [key: string]: DatabaseState };
    dashboards: { [key: string]: DashboardState };
    workflows: { [key: string]: WorkflowState };
}

export interface DefaultRelationZustandActions {
    updateRelationDataWithParams: (relationId: string, query: ViewQueryParameters) => Promise<void>,
    updateRelationBaseQuery: (relationId: string, baseQuery: string) => void,
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>, path?: string[]) => void,
}

interface RelationZustandActions extends DefaultRelationZustandActions {
    mergeState: (state: RelationZustand, openDashboards: boolean) => void,
    /* relation actions */
    getRelation: (relationId: string) => RelationState,
    addNewRelation: (connectionId: string, editorPath: string[], relation?: RelationState) => void,
    relationExists: (relationId: string) => boolean,
    showRelation: (relation: RelationState, editorPath: string[]) => void,
    showRelationFromId: (relationId: string, editorPath: string[]) => void,
    showRelationFromSource: (connectionId: string, source: RelationSource, editorPath: string[]) => void,

    /* relation data actions */
    updateRelationDataWithParams: (relationId: string, query: ViewQueryParameters) => Promise<void>,
    updateRelationBaseQuery: (relationId: string, baseQuery: string) => void,

    /* relation view state actions */
    setRelationViewState: (relationId: string, viewState: RelationViewState) => void,
    getRelationViewState: (relationId: string) => RelationViewState,

    /* schema actions */
    showSchema: (connectionId: string, databaseId: string, schema: DataSourceGroup) => Promise<void>,
    getSchemaState: (schemaId: string) => SchemaState,

    /* database actions */
    showDatabase: (connectionId: string, databaseId: string) => Promise<void>,
    getDatabaseState: (databaseId: string) => DatabaseState,

    /* dashboard actions */
    showDashboard: (dashboard: DashboardState, editorPath: string[]) => Promise<void>,
    showDashboardFromId: (dashboardId: string, editorPath: string[]) => void,
    addNewDashboard: (connectionId: string, editorPath: string[], dashboard?: DashboardState) => void,
    getDashboardState: (dashboardId: string) => DashboardState,
    // **unsafe in terms of adding, renaming, and deleting dashboards**
    setDashboardStateUnsafe: (dashboardId: string, dashboard: DashboardState) => void,

    /* workflow actions */
    addNewWorkflow: (workflow?: WorkflowState, editorPath?: string[]) => void,
    showWorkflow: (workflow: WorkflowState, editorPath: string[]) => void,
    getWorkflowState: (workflowId: string) => WorkflowState,

    /* entity actions */
    deleteEntity: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => void,
    getEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string) => string,
    setEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string, displayName: string, path: string[]) => void,

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
    hydrated: boolean;
    hasDuckDBStorage: boolean;
    setHydrated: (hydrated: boolean) => void;
    setHasDuckDBStorage: (hasDuckDBStorage: boolean) => void;
}

export const useRelationsHydrationState = createWithEqualityFn<RelationsHydrationState>(
    (set, get) => ({
        hydrated: false,
        hasDuckDBStorage: false,
        setHydrated: (hydrated: boolean) => set({hydrated}),
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

                    if (openDashboards) {
                        // open all dashboards in the GUI
                        Object.values(dashboards).forEach((dashboard) => {
                            useGUIState.getState().addDashboardTab(dashboard);
                        });
                    }
                },


                addNewWorkflow: (workflow?: WorkflowState, editorPath?: string[]) => {
                    const local_workflow = workflow ?? GetInitialWorkflowState();
                    const local_editorPath = editorPath ?? [];
                    console.log("Adding new workflow", local_workflow, local_editorPath);
                    get().showWorkflow(local_workflow, local_editorPath);
                },
                showWorkflow: (workflow: WorkflowState, editorPath: string[]) => {
                    const {workflows} = get(); // Get the current state
                    const workflowStateId = workflow.id; // Use the dashboard ID as the state ID
                    const existingWorkflow = workflows[workflowStateId]; // Retrieve the database
                    if (existingWorkflow) {
                        if (useGUIState.getState().isTabOpen(workflowStateId)) {
                            useGUIState.getState().focusTab(workflowStateId);
                        } else {
                            const newWorkflow = deepClone(existingWorkflow);
                            set((state) => ({
                                workflows: {
                                    ...state.workflows,
                                    [workflowStateId]: newWorkflow,
                                },
                            }));
                        }
                        useGUIState.getState().addWorkflowTab(existingWorkflow);

                    } else {
                        // add to editor elements
                        const parent = findNodeInTrees(get().editorElements, editorPath);
                        const actions = AddEntityActions(editorPath, workflowStateId, 'workflows', workflow.viewState.displayName, parent);
                        const newElements = copyAndApplyTreeActions(get().editorElements, actions);

                        set((state) => ({
                            workflows: {
                                ...state.workflows,
                                [workflowStateId]: workflow,
                            },
                            editorElements: newElements,
                        }));
                        useGUIState.getState().addWorkflowTab(workflow);

                    }
                },
                getWorkflowState: (workflowId: string) => {
                    const workflow = get().workflows[workflowId];
                    if (!workflow) {
                        throw new Error(`Workflow with id ${workflowId} not found`);
                    }
                    return workflow;
                },

                deleteEntity: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => {
                    if (useGUIState.getState().isTabOpen(entityId)) {
                        useGUIState.getState().removeTab(entityId);
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
                    return GetEntityDisplayName(entityId, entityType, get());
                },

                setEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string, displayName: string, path: string[]) => {
                    const newEntity = SetEntityDisplayName(entityId, entityType, displayName, get());
                    useGUIState.getState().renameTab(entityId, displayName);

                    const node = findNodeInTrees(get().editorElements, path);
                    const actions = RenameNodeActions(path, displayName, node!);
                    const newEditorElements = copyAndApplyTreeActions(get().editorElements, actions);
                    set((state) => ({
                        [entityType]: {
                            ...state[entityType],
                            [entityId]: newEntity,
                        },
                        editorElements: newEditorElements,
                    }));
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
                    get().showDashboard(local_dashboard, editorPath);
                },

                addNewRelation: async (connectionId: string, editorPath: string[], relation?: RelationState) => {
                    const baseQuery = "SELECT 'Hello, World! 🦆' AS message;";
                    if (!relation) {
                        const local_source: RelationSource = {
                            type: "query",
                            baseQuery: baseQuery,
                            id: getRandomId(),
                            name: "New Query"
                        }
                        get().showRelationFromSource(connectionId, local_source, editorPath);
                    } else {
                        // make sure that this relation is not already in the state
                        get().showRelation(relation, editorPath);
                    }
                },
                showDashboardFromId: (dashboardId: string, editorPath: string[]) => {
                    const dashboard = get().dashboards[dashboardId];
                    get().showDashboard(dashboard, editorPath);
                },
                showDashboard: async (dashboard: DashboardState, editorPath: string[]) => {
                    const {dashboards} = get(); // Get the current state
                    const dashboardStateId = dashboard.id; // Use the dashboard ID as the state ID
                    const existingDashboard = dashboards[dashboardStateId]; // Retrieve the database
                    if (existingDashboard) {
                        if (useGUIState.getState().isTabOpen(dashboardStateId)) {
                            useGUIState.getState().focusTab(dashboardStateId);
                        } else {
                            const newDashboard = deepClone(existingDashboard);
                            set((state) => ({
                                dashboards: {
                                    ...state.dashboards,
                                    [dashboardStateId]: newDashboard,
                                },
                            }));
                            useGUIState.getState().addDashboardTab(dashboard);
                        }
                    } else {
                        // add to editor elements
                        const parent = findNodeInTrees(get().editorElements, editorPath);
                        const actions = AddEntityActions(editorPath, dashboardStateId, 'dashboards', dashboard.viewState.displayName, parent);
                        const newElements = copyAndApplyTreeActions(get().editorElements, actions);

                        set((state) => ({
                            dashboards: {
                                ...state.dashboards,
                                [dashboardStateId]: dashboard,
                            },
                            editorElements: newElements,
                        }));
                        useGUIState.getState().addDashboardTab(dashboard);
                    }
                },
                setDashboardStateUnsafe: (dashboardId: string, dashboard: DashboardState) => {
                    set((state) => ({
                        dashboards: {
                            ...state.dashboards,
                            [dashboardId]: dashboard,
                        },
                    }));
                },
                showSchema: async (connectionId: string, databaseId: string, schema: DataSourceGroup) => {
                    const {schemas} = get(); // Get the current state
                    const schemaId = getSchemaId(connectionId, databaseId, schema); // Generate the schema ID
                    const existingSchema = schemas[schemaId]; // Retrieve the schema
                    if (existingSchema) {
                        useGUIState.getState().focusTab(schemaId);
                    } else {
                        set((state) => ({
                            schemas: {
                                ...state.schemas,
                                [schemaId]: {
                                    ...schema,
                                    connectionId,
                                    databaseId,
                                }
                            },
                        }));
                        useGUIState.getState().addSchemaTab(schemaId, schema);
                    }
                },
                showDatabase: async (connectionId: string, databaseId: string) => {
                    const {databases} = get(); // Get the current state
                    const databaseTabId = getDatabaseId(connectionId, databaseId); // Generate the database ID
                    const existingDatabase = databases[databaseId]; // Retrieve the database
                    if (existingDatabase) {
                        useGUIState.getState().focusTab(databaseTabId);
                    } else {
                        const sourceConnection = useSourceConState.getState().getSourceConnection(connectionId);
                        const databaseSource = sourceConnection?.dataSources[databaseId]!;
                        if (!databaseSource) {
                            throw new Error(`Database ${databaseId} not found`);
                        }
                        const database: DatabaseState = {
                            ...databaseSource as any,
                            databaseId: databaseTabId,
                            connectionId,
                        }
                        set((state) => ({
                            databases: {
                                ...state.databases,
                                [databaseTabId]: {
                                    ...database,
                                    connectionId,
                                }
                            },
                        }));
                        useGUIState.getState().addDatabaseTab(databaseTabId, database);
                    }
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

                showRelation(relation: RelationState, editorPath: string[]) {
                    const relationId = getRelationIdFromSource(relation.connectionId, relation.source)
                    const {relations} = get(); // Get the current state
                    const existingRelation = relations[relationId]; // Retrieve the relation
                    if (existingRelation) {
                        if (useGUIState.getState().isTabOpen(relationId)) {
                            useGUIState.getState().focusTab(relationId);
                        } else {
                            const newRelation = deepClone(existingRelation);
                            set((state) => ({
                                relations: {
                                    ...state.relations,
                                    [relationId]: newRelation,
                                },
                            }));
                            useGUIState.getState().addRelationTab(relation);
                        }
                    } else {

                        const parent = findNodeParentInTrees(get().editorElements, editorPath);
                        const actions = AddEntityActions(editorPath, relationId, 'relations', relation.viewState.displayName, parent);
                        const newElements = copyAndApplyTreeActions(get().editorElements, actions);
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: relation,
                            },
                            editorElements: newElements,
                        }));
                        useGUIState.getState().addRelationTab(relation);
                    }
                },
                showRelationFromId: (relationId: string, editorPath: string[]) => {
                    const relation = get().relations[relationId];
                    get().showRelation(relation, editorPath);
                },
                showRelationFromSource: async (connectionId: string, source: RelationSource, editorPath: string[]) => {

                    const relationId = getRelationIdFromSource(connectionId, source);

                    // check if relation already exists
                    const existingRelation = get().relations[relationId];
                    if (existingRelation) {
                        get().showRelation(existingRelation, editorPath);
                    } else {
                        // update state with empty (loading) relation
                        const defaultQueryParams = getInitialParams();
                        const emptyRelationState = await getViewFromSource(connectionId, source, defaultQueryParams, {state: 'running'});

                        // as the relation did not exist yet, we also have to add a reference to the editor
                        const parent = findNodeInTrees(get().editorElements, editorPath);
                        const actions = AddEntityActions(editorPath, relationId, 'relations', emptyRelationState.viewState.displayName, parent);

                        const newElements = copyAndApplyTreeActions(get().editorElements, actions);
                        // finally update the state
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: emptyRelationState,
                            },
                            editorElements: newElements,
                        }));

                        useGUIState.getState().addRelationTab(emptyRelationState);

                        // execute query
                        const executedRelationState = await executeQueryOfRelationState(emptyRelationState);
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: executedRelationState,
                            },
                        }));
                    }
                },

                updateRelationDataWithParams: async (relationId, query) => {

                    const {relations} = get(); // Get the current state

                    const relation = relations[relationId]; // Retrieve the specific relation
                    const loadingRelationState = setRelationLoading(relation); // Set it loading
                    set((state) => ({
                        relations: {
                            ...state.relations,
                            [relationId]: loadingRelationState,
                        },
                    }));


                    try {
                        const updatedRelationState = await updateRelationQueryForParams(loadingRelationState, query); // Update the relation state
                        const executedRelationState = await executeQueryOfRelationState(updatedRelationState);
                        // update state with new data and completed state
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: executedRelationState,
                            },
                        }));
                    } catch (e) {
                        // if error update with error state
                        const errorState = returnEmptyErrorState(loadingRelationState, e)
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: errorState,
                            },
                        }));
                    }
                },

                updateRelationBaseQuery: (relationId: string, baseQuery: string) => {

                    set((state) => ({
                        relations: {
                            ...state.relations,
                            [relationId]: {
                                ...state.relations[relationId],
                                query: {
                                    ...state.relations[relationId].query,
                                    baseQuery: baseQuery,
                                },
                            },
                        },
                    }));
                },

                setRelationViewState: (relationId: string, viewState: RelationViewState) => {
                    set((state) => ({
                        relations: {
                            ...state.relations,
                            [relationId]: {
                                ...state.relations[relationId],
                                viewState,
                            },
                        }
                    }));
                },

                getRelationViewState: (relationId: string) => {
                    return get().relations[relationId].viewState;
                },
                updateRelationViewState: (relationId: string, partialUpdate: DeepPartial<RelationViewState>, path?: string[]) => {
                    const currentViewState = deepClone(get().relations[relationId].viewState);
                    let newEditorElements = get().editorElements;

                    // check if displayName is updated, if so, update the tab title
                    if (partialUpdate.displayName) {
                        useGUIState.getState().renameTab(relationId, partialUpdate.displayName);

                        // path must be provided if the displayName is updated
                        if (!path) {
                            throw new Error('Path must be provided if displayName is updated');
                        }

                        const node = findNodeInTrees(newEditorElements, path);
                        const actions = RenameNodeActions(path, partialUpdate.displayName, node!);
                        newEditorElements = copyAndApplyTreeActions(newEditorElements, actions);
                    }
                    safeDeepUpdate(currentViewState, partialUpdate); // mutate the clone, not the original
                    set((state) => ({
                        relations: {
                            ...state.relations,
                            [relationId]: {
                                ...state.relations[relationId],
                                viewState: currentViewState,
                            },
                        },
                        editorElements: newEditorElements,
                    }));

                    // if the view mode has been changed, update the query params
                    if (partialUpdate.selectedView) {
                        const relation = get().relations[relationId];
                        const viewParameters = relation.query.viewParameters;
                        const newViewParameters: ViewQueryParameters = {
                            ...viewParameters,
                            type: partialUpdate.selectedView
                        };
                        get().updateRelationDataWithParams(relationId, newViewParameters);
                    }
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

                    IterateAll([elementToRemove], (node, id_path) => {
                        if (node.type === 'dashboard') {
                            if (useGUIState.getState().isTabOpen(node.id)) {
                                useGUIState.getState().removeTab(node.id);
                            }
                            delete newDashboards[node.id];
                        } else if (node.type === 'relation') {
                            if (useGUIState.getState().isTabOpen(node.id)) {
                                useGUIState.getState().removeTab(node.id);
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
            partialize: (state) => {
                const newState = {...state};
                // @ts-ignore
                delete newState.layoutModel;
                return newState;
            },
            onRehydrateStorage: (state => {
                function callback(state: any, error: any) {
                    if (state === undefined) {
                        // if state is undefined, remove all tabs
                        useGUIState.getState().keepTabsOfIds([]);
                        useRelationsHydrationState.getState().setHydrated(true);
                        return INIT;
                    }

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

                    if (useRelationsHydrationState.getState().hasDuckDBStorage) {
                        useGUIState.getState().keepTabsOfIds(ids);
                        maybeAttachDatabaseFromUrlParam();
                        useRelationsHydrationState.getState().setHydrated(true);
                    }


                }


                return callback;
            })
        }
    )
);