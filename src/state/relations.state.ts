import {getRelationIdFromSource, RelationSource, RelationSourceQuery} from "@/model/relation";
import {Model} from "flexlayout-react";
import {
    addDashboardToLayout,
    addDatabaseToLayout,
    addRelationToLayout,
    addSchemaToLayout,
    focusTabById,
    getInitialLayoutModel, removeTab, renameTab
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
import {DataSourceGroup} from "@/model/connection";
import {getSchemaId, SchemaState} from "@/model/schema-state";
import {DatabaseState, getDatabaseId} from "@/model/database-state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/utils";
import {createJSONStorage, persist} from "zustand/middleware";
import {duckdbStorage} from "@/state/persistency/duckdb";
import {createWithEqualityFn} from "zustand/traditional";
import {
    DashboardElement,
    DashboardElementBase,
    DashboardState,
    DashboardViewState,
    getInitDashboardViewState
} from "@/model/dashboard-state";
import {getRandomId} from "@/platform/id-utils";

export interface RelationZustand {

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
    updateRelationViewState: (relationId: string, viewState: DeepPartial<RelationViewState>) => void,

}

interface RelationZustandActions extends DefaultRelationZustandActions {
    relationExists: (relationId: string) => boolean,
    getRelation: (relationId: string) => RelationState,

    showRelation: (relation: RelationState) => void,
    addNewRelation: (connectionId: string) => Promise<void>,
    showRelationFromSource: (connectionId: string, source: RelationSource) => Promise<void>,
    updateRelationDataWithParams: (relationId: string, query: RelationQueryParams) => Promise<void>,
    updateRelationBaseQuery: (relationId: string, baseQuery: string) => void,
    setRelationViewState: (relationId: string, viewState: RelationViewState) => void,
    getRelationViewState: (relationId: string) => RelationViewState,
    deleteRelation: (relationId: string) => void,

    showSchema: (connectionId: string, databaseId: string, schema: DataSourceGroup) => Promise<void>,
    getSchemaState: (schemaId: string) => SchemaState,

    showDatabase: (connectionId: string, database: DataSourceGroup) => Promise<void>,
    getDatabaseState: (databaseId: string) => DatabaseState,

    showDashboard: (dashboard: DashboardState) => Promise<void>,
    addNewDashboard: (connectionId: string) => Promise<void>,
    deleteDashboard: (dashboardId: string) => void,
    updateDashboardViewState: (dashboardId: string, viewState: DeepPartial<DashboardViewState>) => void,
    getDashboardState: (dashboardId: string) => DashboardState,
    setDashboardState: (dashboardId: string, dashboard: DashboardState) => void,
    setDashboardElement: (dashboardId: string, elementId: string, element: DashboardElement) => void,

    manualPersistModel: () => void,

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
                selectedTabId: undefined,
                addNewDashboard: async () => {
                    const randomId = `dashboard-${getRandomId()}`;
                    const dashboard: DashboardState = {
                        id: randomId,
                        name: "New Dashboard",
                        elements: {},
                        viewState: getInitDashboardViewState("New Dashboard"),
                    }
                    get().showDashboard(dashboard);
                },
                deleteDashboard: (dashboardId: string) => {
                    const {dashboards} = get();
                    if (dashboards[dashboardId].viewState.isTabOpen) {
                        removeTab(get().layoutModel, dashboardId);
                    }
                    const newDashboards = {...dashboards};
                    delete newDashboards[dashboardId];
                    set({dashboards: newDashboards});
                },
                updateDashboardViewState: (dashboardId: string, partialUpdate: DeepPartial<DashboardViewState>) => {
                    console.log('updateDashboardViewState', dashboardId, partialUpdate);
                    console.log('dashboards', get().dashboards[dashboardId]);
                    const currentViewState = deepClone(get().dashboards[dashboardId].viewState);

                    // check if displayName is updated, if so, update the tab title
                    if (partialUpdate.displayName) {
                        const model = get().layoutModel;
                        renameTab(model, dashboardId, partialUpdate.displayName);
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
                    }));
                },
                addNewRelation: async (connectionId: string) => {
                    const randomId = getRandomId();
                    const baseQuery = "SELECT 'Hello, World! 🦆' AS message;";
                    const source: RelationSourceQuery = {
                        type: "query",
                        baseQuery: baseQuery,
                        id: randomId,
                        name: "New Query"
                    }

                    get().showRelationFromSource(connectionId, source);
                },
                showDashboard: async (dashboard: DashboardState) => {
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
                        set((state) => ({
                            dashboards: {
                                ...state.dashboards,
                                [dashboardStateId]: dashboard,
                            },
                        }));
                        addDashboardToLayout(layoutModel, dashboardStateId, dashboard);
                    }
                },
                setDashboardState: (dashboardId: string, dashboard: DashboardState) => {
                    set((state) => ({
                        dashboards: {
                            ...state.dashboards,
                            [dashboardId]: dashboard,
                        },
                    }));
                },
                setDashboardElement: (dashboardId: string, elementId: string, element: DashboardElement) => {
                    const dashboard = get().dashboards[dashboardId];
                    const newElements = {...dashboard.elements};
                    newElements[elementId] = element;

                    set((state) => ({
                        dashboards: {
                            ...state.dashboards,
                            [dashboardId]: {
                                ...state.dashboards[dashboardId],
                                elements: newElements,
                            },
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

                showRelation(relation: RelationState) {
                    const relationId = getRelationIdFromSource(relation.connectionId, relation.source)
                    const {relations} = get(); // Get the current state
                    const existingRelation = relations[relationId]; // Retrieve the relation
                    if (existingRelation) {
                        console.log('relation found', relationId);
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
                        console.log('relation not found', relationId);
                        console.log('relation', relation);
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: relation,
                            },
                        }));
                        const model = get().layoutModel;
                        addRelationToLayout(model, relation);
                    }
                },
                showRelationFromSource: async (connectionId: string, source: RelationSource) => {

                    const relationId = getRelationIdFromSource(connectionId, source);

                    // check if relation already exists
                    const existingRelation = get().relations[relationId];
                    if (existingRelation) {
                        get().showRelation(existingRelation);
                    } else {

                        // update state with empty (loading) relation
                        const defaultQueryParams = getDefaultQueryParams();
                        const emptyRelationState = await getViewFromSource(connectionId, source, defaultQueryParams, {state: 'running'});
                        set((state) => ({
                            relations: {
                                ...state.relations,
                                [relationId]: emptyRelationState,
                            },
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
                updateRelationViewState: (relationId: string, partialUpdate: DeepPartial<RelationViewState>) => {

                    const currentViewState = deepClone(get().relations[relationId].viewState);

                    // check if displayName is updated, if so, update the tab title
                    if (partialUpdate.displayName) {
                        const model = get().layoutModel;
                        renameTab(model, relationId, partialUpdate.displayName);
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
                    }));

                },
                deleteRelation: (relationId: string) => {
                    const {relations} = get();
                    const newRelations = {...relations};
                    delete newRelations[relationId];

                    if (relations[relationId].viewState.isTabOpen) {
                        removeTab(get().layoutModel, relationId);
                    }
                    set({relations: newRelations});
                },

                setSelectedTabId: (tabId: string) => {
                    console.log('setSelectedTabId', tabId);
                    set({selectedTabId: tabId});
                },
                closeTab: (tabId: string) => {
                    const { schemas, databases, relations, dashboards } = get();

                    if (schemas[tabId]) {
                        const newSchemas = { ...schemas };
                        delete newSchemas[tabId];
                        set({ schemas: newSchemas });
                    } else if (databases[tabId]) {
                        const newDatabases = { ...databases };
                        delete newDatabases[tabId];
                        set({ databases: newDatabases });
                    } else if (relations[tabId]) {
                        const newRelations = { ...relations };
                        newRelations[tabId].viewState.isTabOpen = false;
                        set({ relations: newRelations });
                    } else if (dashboards[tabId]) {
                        const newDashboards = { ...dashboards };
                        newDashboards[tabId].viewState.isTabOpen = false;
                        set({ dashboards: newDashboards });
                    }
                },


                getModel: () => get().layoutModel,
                setModel: (model: Model) =>
                    set(() => ({
                            layoutModel: model,
                        }),
                    ),

                manualPersistModel: () => {
                    set(() => ({}));
                },

                layoutModel: getInitialLayoutModel(),
            }),
        {
            name: 'relationState',
            storage: createJSONStorage(() => duckdbStorage),
            partialize: (state) =>
                Object.fromEntries(
                    Object.entries(state).filter(([key]) => !EXCLUDED_KEYS.includes(key)),
                ) as RelationZustandCombined,
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


interface TestState {
    bears: number;
    increase: () => void;
}

export const useTestState = createWithEqualityFn(
    persist<TestState>(
        (set, get) => ({
            bears: 0,
            increase: () => set((state) => ({bears: state.bears + 1})),
        }),
        {
            name: 'test-state',
            // storage: createJSONStorage(() => duckdbStorage),
        }
    )
);