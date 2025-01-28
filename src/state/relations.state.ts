import {getRelationIdFromSource, RelationSource, RelationSourceQuery} from "@/model/relation";
import {Model} from "flexlayout-react";
import {
    addDashboardToLayout,
    addDatabaseToLayout,
    addRelationToLayout,
    addSchemaToLayout,
    focusTabById,
    getInitialLayoutModel,
    removeTab,
    renameTab
} from "@/state/relations/layout-updates";
import {
    executeQueryOfRelationState,
    getDefaultQueryParams,
    getViewFromSource,
    RelationQueryParams,
    RelationState,
    setRelationLoading,
    updateRelationQueryForParams,
} from "@/model/relation-state";
import {RelationViewState} from "@/model/relation-view-state";
import {DataConnection, DataSourceGroup} from "@/model/connection";
import {getSchemaId, SchemaState} from "@/model/schema-state";
import {DatabaseState, getDatabaseId} from "@/model/database-state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {createJSONStorage, persist} from "zustand/middleware";
import {duckdbStorage} from "@/state/persistency/duckdb";
import {createWithEqualityFn} from "zustand/traditional";
import {DashboardState, DashboardViewState, getInitDashboardViewState} from "@/model/dashboard-state";
import {getRandomId} from "@/platform/id-utils";
import {EditorFolder} from "@/model/editor-folder";
import {
    addNode,
    applyTreeActions, copyAndApplyTreeActions, findNodeInTrees, findNodeParentInTrees, IterateAll,
    removeNode,
    TreeAction,
    updateNode
} from "@/components/basics/files/tree-utils";
import {
    AddDashboardActions,
    AddRelationActions,
    RemoveNodeAction,
    RenameNodeActions
} from "@/components/basics/files/tree-action-utils";

export interface RelationZustand {

    editorElements: EditorFolder[];
    relations: { [key: string]: RelationState };
    schemas: { [key: string]: SchemaState };
    databases: { [key: string]: DatabaseState };
    dashboards: { [key: string]: DashboardState };

    selectedTabId: string | undefined;
    layoutModel: Model;
}

export interface DefaultRelationZustandActions {
    updateRelationDataWithParams: (relationId: string, query: RelationQueryParams) => Promise<void>,
    updateRelationBaseQuery: (relationId: string, baseQuery: string) => void,
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>, path?: string[]) => void,
}

interface RelationZustandActions extends DefaultRelationZustandActions {


    /* relation actions */
    getRelation: (relationId: string) => RelationState,
    addNewRelation: (connectionId: string, editorPath: string[], relation?: RelationState) => void,
    relationExists: (relationId: string) => boolean,
    deleteRelation: (relationId: string, editorPath: string[]) => void,
    showRelation: (relation: RelationState, editorPath: string[]) => void,
    showRelationFromId: (relationId: string, editorPath: string[]) => void,
    showRelationFromSource: (connectionId: string, source: RelationSource, editorPath: string[]) => void,

    /* relation data actions */
    updateRelationDataWithParams: (relationId: string, query: RelationQueryParams) => Promise<void>,
    updateRelationBaseQuery: (relationId: string, baseQuery: string) => void,

    /* relation view state actions */
    setRelationViewState: (relationId: string, viewState: RelationViewState) => void,
    getRelationViewState: (relationId: string) => RelationViewState,

    /* schema actions */
    showSchema: (connectionId: string, databaseId: string, schema: DataSourceGroup) => Promise<void>,
    getSchemaState: (schemaId: string) => SchemaState,

    /* database actions */
    showDatabase: (connectionId: string, database: DataSourceGroup) => Promise<void>,
    getDatabaseState: (databaseId: string) => DatabaseState,

    /* dashboard actions */
    showDashboard: (dashboard: DashboardState, editorPath: string[]) => Promise<void>,
    showDashboardFromId: (dashboardId: string, editorPath: string[]) => void,
    addNewDashboard: (connectionId: string, editorPath: string[], dashboard?: DashboardState) => void,
    deleteDashboard: (dashboardId: string, editorPath: string[]) => void,
    updateDashboardViewState: (dashboardId: string, viewState: DeepPartial<DashboardViewState>, editorPath?: string[]) => void,
    getDashboardState: (dashboardId: string) => DashboardState,
    // **unsafe in terms of adding, renaming, and deleting dashboards**
    setDashboardStateUnsafe: (dashboardId: string, dashboard: DashboardState) => void,

    /* editor folder actions */
    updateEditorElements: (path: string[], newFolder: EditorFolder) => void,
    addEditorElement: (path: string[], newFolder: EditorFolder) => void,
    removeEditorElement: (path: string[]) => void,
    applyEditorElementsActions: (actions: TreeAction[]) => void,
    resetEditorElements: () => void,

    /* persistence actions */
    manualPersistModel: () => void,

    /* tab actions */
    getModel: () => Model;
    setModel: (model: Model) => void;
    closeTab: (tabId: string) => void,
    setSelectedTabId: (tabId: string) => void,
}

type RelationZustandCombined = RelationZustand & RelationZustandActions;

export const useRelationsState = createWithEqualityFn(
    persist<RelationZustandCombined>(
        (set, get) =>
            ({
                relations: {},
                schemas: {},
                databases: {},
                dashboards: {},
                editorElements: [],
                selectedTabId: undefined,
                addNewDashboard: async (connectionId: string, editorPath: string[], dashboard?: DashboardState) => {
                    const randomId = `dashboard-${getRandomId()}`;
                    let local_dashboard: DashboardState | undefined = dashboard;
                    if (!local_dashboard) {
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
                deleteDashboard: (dashboardId: string, editorPath: string[]) => {
                    const {dashboards} = get();
                    if (dashboards[dashboardId].viewState.isTabOpen) {
                        removeTab(get().layoutModel, dashboardId);
                    }
                    const newDashboards = {...dashboards};
                    delete newDashboards[dashboardId];

                    const actions = RemoveNodeAction(editorPath);
                    const newElements = copyAndApplyTreeActions(get().editorElements, actions);
                    set({
                        dashboards: newDashboards,
                        editorElements: newElements,
                    });
                },
                updateDashboardViewState: (dashboardId: string, partialUpdate: DeepPartial<DashboardViewState>, path?: string[]) => {
                    const currentViewState = deepClone(get().dashboards[dashboardId].viewState);
                    let newEditorElements = get().editorElements;
                    // check if displayName is updated, if so, update the tab title
                    if (partialUpdate.displayName) {
                        const model = get().layoutModel;
                        renameTab(model, dashboardId, partialUpdate.displayName);

                        // path must be provided if the displayName is updated
                        if (!path) {
                            throw new Error('Path must be provided if displayName is updated');
                        }

                        const node = findNodeInTrees(get().editorElements, path);
                        const actions = RenameNodeActions(path, partialUpdate.displayName, node!);
                        newEditorElements = copyAndApplyTreeActions(get().editorElements, actions);

                    }
                    safeDeepUpdate(currentViewState, partialUpdate); // mutate the clone, not the original
                    set((state) => ({
                        dashboards: {
                            ...state.dashboards,
                            [dashboardId]: {
                                ...state.dashboards[dashboardId],
                                viewState: currentViewState,
                            },
                        },
                        editorElements: newEditorElements,
                    }));

                    console.log('dashboards', get().dashboards);
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
                    const {dashboards, layoutModel} = get(); // Get the current state
                    const dashboardStateId = dashboard.id; // Use the dashboard ID as the state ID
                    const existingDashboard = dashboards[dashboardStateId]; // Retrieve the database
                    if (existingDashboard) {
                        if (existingDashboard.viewState.isTabOpen) {
                            focusTabById(layoutModel, dashboardStateId);
                        } else {
                            const newDashboard = deepClone(existingDashboard);
                            newDashboard.viewState.isTabOpen = true;
                            set((state) => ({
                                dashboards: {
                                    ...state.dashboards,
                                    [dashboardStateId]: newDashboard,
                                },
                            }));
                            addDashboardToLayout(layoutModel, dashboardStateId, dashboard);
                        }
                    } else {
                        // add to editor elements
                        const parent = findNodeInTrees(get().editorElements, editorPath);
                        const actions = AddDashboardActions(editorPath, dashboardStateId, parent, dashboard.viewState.displayName);
                        const newElements = copyAndApplyTreeActions(get().editorElements, actions);

                        set((state) => ({
                            dashboards: {
                                ...state.dashboards,
                                [dashboardStateId]: dashboard,
                            },
                            editorElements: newElements,
                        }));
                        addDashboardToLayout(layoutModel, dashboardStateId, dashboard);
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
                        focusTabById(get().layoutModel, schemaId);
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
                        const model = get().layoutModel;
                        addSchemaToLayout(model, schemaId, schema);
                    }
                },
                showDatabase: async (connectionId: string, database: DataSourceGroup) => {
                    const {databases} = get(); // Get the current state
                    const databaseId = getDatabaseId(connectionId, database.id); // Generate the database ID
                    const existingDatabase = databases[databaseId]; // Retrieve the database
                    if (existingDatabase) {
                        focusTabById(get().layoutModel, databaseId);
                    } else {
                        set((state) => ({
                            databases: {
                                ...state.databases,
                                [databaseId]: {
                                    ...database,
                                    connectionId,
                                }
                            },
                        }));
                        const model = get().layoutModel;
                        addDatabaseToLayout(model, databaseId, database);
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
                        if (existingRelation.viewState.isTabOpen) {
                            focusTabById(get().layoutModel, relationId);
                        } else {
                            const newRelation = deepClone(existingRelation);
                            newRelation.viewState.isTabOpen = true;
                            set((state) => ({
                                relations: {
                                    ...state.relations,
                                    [relationId]: newRelation,
                                },
                            }));
                            addRelationToLayout(get().layoutModel, existingRelation);
                        }
                    } else {

                        const parent = findNodeParentInTrees(get().editorElements, editorPath);
                        const actions = AddRelationActions(editorPath, relationId, parent, relation.viewState.displayName);
                        const newElements = copyAndApplyTreeActions(get().editorElements, actions);
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: relation,
                            },
                            editorElements: newElements,
                        }));
                        const model = get().layoutModel;
                        addRelationToLayout(model, relation);
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
                        const defaultQueryParams = getDefaultQueryParams();
                        const emptyRelationState = await getViewFromSource(connectionId, source, defaultQueryParams, {state: 'running'});

                        // as the relation did not exist yet, we also have to add a reference to the editor
                        const parent = findNodeInTrees(get().editorElements, editorPath);
                        const actions = AddRelationActions(editorPath, relationId, parent, emptyRelationState.viewState.displayName);
                        const newElements = copyAndApplyTreeActions(get().editorElements, actions);
                        // finally update the state
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: emptyRelationState,
                            },
                            editorElements: newElements,
                        }));

                        const model = get().layoutModel;
                        addRelationToLayout(model, emptyRelationState);

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

                    const updatedRelationState = await updateRelationQueryForParams(loadingRelationState, query); // Update the relation state
                    const executedRelationState = await executeQueryOfRelationState(updatedRelationState);
                    // update state with new data and completed state
                    set((state) => ({
                        relations: {
                            ...state.relations,
                            [relationId]: executedRelationState,
                        },
                    }));
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
                        const model = get().layoutModel;
                        renameTab(model, relationId, partialUpdate.displayName);

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

                },
                deleteRelation: (relationId: string, editorPath: string[]) => {
                    const {relations} = get();
                    const newRelations = {...relations};
                    delete newRelations[relationId];

                    if (relations[relationId].viewState.isTabOpen) {
                        removeTab(get().layoutModel, relationId);
                    }

                    const actions = RemoveNodeAction(editorPath);
                    const newElements = copyAndApplyTreeActions(get().editorElements, actions);

                    set({
                        relations: newRelations,
                        editorElements: newElements,
                    });
                },

                setSelectedTabId: (tabId: string) => {
                    set({selectedTabId: tabId});
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
                        newRelations[tabId].viewState.isTabOpen = false;
                        set({relations: newRelations});
                    } else if (dashboards[tabId]) {
                        const newDashboards = {...dashboards};
                        newDashboards[tabId].viewState.isTabOpen = false;
                        set({dashboards: newDashboards});
                    }
                },


                getModel: () => get().layoutModel,
                setModel: (model: Model) =>
                    set(() => ({
                            layoutModel: model,
                        }),
                    ),
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
                            if (newDashboards[node.id].viewState.isTabOpen) {
                                removeTab(get().layoutModel, node.id);
                            }
                            delete newDashboards[node.id];
                        } else if (node.type === 'relation') {
                            if (newRelations[node.id].viewState.isTabOpen) {
                                removeTab(get().layoutModel, node.id);
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

                layoutModel: getInitialLayoutModel(),
            }),
        {
            name: 'relationState',
            storage: createJSONStorage(() => duckdbStorage),
            partialize: (state) => {
                const newState = {...state};
                // @ts-ignore
                delete newState.layoutModel;
                return newState;
            }
        }
    )
);

const EXCLUDED_KEYS = ['layoutModel'];

const unsub = useRelationsState.persist.onFinishHydration((state) => {

    const model = state.layoutModel;
    for (const schemaId in state.schemas) {
        addSchemaToLayout(model, schemaId, state.schemas[schemaId]);
    }
    for (const databaseId in state.databases) {
        addDatabaseToLayout(model, databaseId, state.databases[databaseId]);
    }
    for (const relationId in state.relations) {
        if (!state.relations[relationId].viewState.isTabOpen) {
            continue;
        }
        addRelationToLayout(model, state.relations[relationId]);
    }
    for (const dashboardId in state.dashboards) {
        if (!state.dashboards[dashboardId].viewState.isTabOpen) {
            continue;
        }
        addDashboardToLayout(model, dashboardId, state.dashboards[dashboardId]);
    }

    unsub();
})