import {getRelationIdFromSource, RelationSource} from "@/model/relation";
import {RelationState,} from "@/model/relation-state";
import {SchemaState} from "@/model/schema-state";
import {DatabaseState} from "@/model/database-state";
import {persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {
    appendWidgetToLayouts,
    createRelationWidget,
    createTextWidget,
    DashboardState,
    DashboardWidget,
    getInitDashboardState,
} from "@/model/dashboard-state";
import type {ResponsiveLayouts} from "react-grid-layout";
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
import {RemoveNodeAction, RenameNodeActions} from "@/components/basics/files/tree-action-utils";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";
import {InitializeStorage} from "@/state/persistency/api";
import {GetInitialCanvasState, CanvasState} from "@/model/canvas-state";
import {purgeRelationReferences} from "@/state/relations/relation-dependencies";
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
import {RelationEvents} from "@/state/relations/event/relation-events";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {migrateV1FlattenRelationState} from "@/state/migrations/v1-flatten-relation-state";
import {migrateDashboardsToGrid} from "@/state/migrations/v2-dashboards-to-grid";
import {withViewed} from "@/state/entities/entity-base";

const nav = DashNavigator.instance();


/** Element kinds that appear in the folder view and carry usage metadata. */
export type ViewableEntityType = 'folder' | 'relations' | 'dashboards' | 'canvas';


export interface RelationZustand {
    editorElements: EditorFolder[];
    relations: { [key: string]: RelationState };
    schemas: { [key: string]: SchemaState };
    databases: { [key: string]: DatabaseState };
    dashboards: { [key: string]: DashboardState };
    canvas: { [key: string]: CanvasState };
}

export interface DefaultRelationZustandActions {
    // the ID of a relation may never be updated!
    updateRelation: (newRelation: RelationState) => void,
}

interface RelationZustandActions extends DefaultRelationZustandActions {
    mergeState: (state: RelationZustand, openDashboards: boolean) => void,
    /* relation actions */
    addNewRelation: (connectionId: string, editorPath: string[], relation: RelationState, openTab?: boolean) => void,
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
    // grid widget/layout actions (targeted, merge-safe against concurrent drags)
    // High-level: the single way to add a widget to a dashboard (used by UI + chat tools).
    addRelationWidgetToDashboard: (dashboardId: string, relationId: string) => void,
    addTextWidgetToDashboard: (dashboardId: string, text?: string) => void,
    // Low-level primitive (used internally by the two actions above).
    addDashboardWidget: (dashboardId: string, widget: DashboardWidget, layouts: ResponsiveLayouts) => void,
    removeDashboardWidget: (dashboardId: string, widgetId: string) => void,
    updateDashboardWidget: (dashboardId: string, widgetId: string, patch: Partial<DashboardWidget>) => void,
    setDashboardLayouts: (dashboardId: string, layouts: ResponsiveLayouts) => void,

    /* canvas actions */
    addNewCanvas: (canvas?: CanvasState, editorPath?: string[]) => void,
    getCanvasState: (canvasId: string) => CanvasState,
    updateCanvasState: (canvasId: string, canvas: Partial<CanvasState>) => void,
    // High-level: add a node referencing an existing relation to a canvas (mirrors addRelationWidgetToDashboard).
    addRelationToCanvas: (canvasId: string, relationId: string) => void,
    /* entity actions */
    deleteEntity: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => void,
    getEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string) => string,
    setEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string, displayName: string, path: string[]) => void,
    addEntity(entityType: RelationZustandEntityType, entity: RelationZustandEntity, path: string[], openTab?: boolean) : void,
    showEntityFromId: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => void,
    markEntityViewed: (entityType: ViewableEntityType, entityId: string) => void,

    /* editor folder actions */
    updateEditorElements: (path: string[], newFolder: EditorFolder) => void,
    addEditorElement: (path: string[], newFolder: EditorFolder) => void,
    deleteEditorElement: (path: string[]) => void,
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
    canvas: {},
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
                            this.addEntity('dashboards', dashboard, []);
                        });
                    }
                },

                addNewCanvas: (canvas?: CanvasState, editorPath?: string[]) => {
                    const local_canvas = canvas ?? GetInitialCanvasState();
                    const local_editorPath = editorPath ?? [];
                    get().addEntity('canvas', local_canvas, local_editorPath);
                },
                getCanvasState: (canvasId: string) => {
                    const canvas = get().canvas[canvasId];
                    if (!canvas) {
                        throw new Error(`Canvas with id ${canvasId} not found`);
                    }
                    return canvas;
                },
                updateCanvasState: (canvasId: string, updates: Partial<CanvasState>) => {
                    set((state) => ({
                        canvas: {
                            ...state.canvas,
                            [canvasId]: {
                                ...state.canvas[canvasId],
                                ...updates,
                                lastEditedAt: Date.now(),
                            },
                        },
                    }));
                },
                addRelationToCanvas: (canvasId: string, relationId: string) => {
                    const canvas = get().canvas[canvasId];
                    if (!canvas) return;
                    if (!get().relations[relationId]) return;
                    // Reference the existing relation by id (no copy) — same model as dashboard widgets.
                    // Size mirrors DEFAULT_NODE_SIZE (25 * GRID_SIZE) from canvas/logic/models; inlined to
                    // avoid importing canvas UI modules into the state layer. Placed top-left; user repositions.
                    const newNode = {
                        id: `node-${getRandomId()}`,
                        type: 'relationNode',
                        position: {x: 0, y: 0},
                        width: 500,
                        height: 500,
                        selected: false,
                        data: {relationId},
                    };
                    get().updateCanvasState(canvasId, {nodes: [...canvas.nodes, newNode]});
                },
                deleteEntity: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => {

                    // Resolve (before mutating the tree) whether the deleted item is the one on screen.
                    const wasShown = nav.isCurrentObjectIdShown(entityId);

                    // if it is a relation, delete the cache, dispatch delete action, and purge
                    // every dashboard widget / canvas node that referenced it
                    let refUpdates: Partial<Pick<RelationZustand, 'dashboards' | 'canvas'>> = {};
                    if (entityType === 'relations') {
                        useRelationDataState.getState().deleteData(entityId);
                        const relation = get().relations[entityId];
                        if (relation) {
                            RelationEvents.delete(relation);
                        }
                        refUpdates = purgeRelationReferences(get().dashboards, get().canvas, new Set([entityId]));
                    }
                    const newCollection = deleteFromEntityCollection(get(), entityType, entityId);
                    const actions = RemoveNodeAction(editorPath);
                    const newElements = copyAndApplyTreeActions(get().editorElements, actions);
                    set({
                        [entityType]: newCollection,
                        editorElements: newElements,
                        ...refUpdates,
                    });

                    // Only leave if the deleted item was on screen (its URL no longer resolves).
                    // Folder views refresh reactively via the tree subscription, so no route needed there.
                    if (wasShown) {
                        const parentPath = editorPath.slice(0, editorPath.length - 1);
                        const parentId = parentPath[parentPath.length - 1];
                        if (parentId) {
                            nav.navigateToObjectId(parentId, true);
                        } else {
                            // Root-level item: no parent folder to fall back to.
                            nav.navigateToLocation(DashLocations.CurrentProjectRoot(), true);
                        }
                    }
                },

                getEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string): string => {
                    return GetEntityDisplayNameById(entityId, entityType, get());
                },

                setEntityDisplayName: (entityType: RelationZustandEntityType, entityId: string, displayName: string, path: string[]) => {

                    const renamed = SetEntityDisplayName(entityId, entityType, displayName, get());
                    // renaming is an edit; stamp it (harmless for non-EntityBase kinds like schemas/databases)
                    const newEntity = {...renamed, lastEditedAt: Date.now()};

                    // renaming may change the derived macro name (and thus the URL) of the shown item
                    const wasShown = DashNavigator.instance().isCurrentObjectIdShown(entityId);

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
                        if (wasShown) {
                            DashNavigator.instance().navigateToObjectId(entityId, true);
                        }
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

                addEntity(entityType: RelationZustandEntityType, entity: RelationZustandEntity, editorPath: string[] = [], openInTab: boolean = true) {

                    const addResult = AddIfNotExists(entity, entityType, get(), editorPath);
                    const entityId = GetEntityId(entity);
                    if (addResult.added) {
                        set((state) => ({
                            [entityType]: addResult.updatedCollection,
                            editorElements: addResult.updatedElements,
                        }));
                    }

                    if (openInTab) {
                        DashNavigator.instance().navigateToObjectId(entityId);
                    }
                },

                showEntityFromId: (entityType: RelationZustandEntityType, entityId: string, editorPath: string[]) => {
                    const collection = getEntityCollection(get(), entityType);
                    const entity = collection[entityId];
                    if (!entity) {
                        throw new Error(`Entity with id ${entityId} not found in ${entityType} collection`);
                    }
                    get().addEntity(entityType, entity, editorPath);
                },

                markEntityViewed: (entityType: ViewableEntityType, entityId: string) => {
                    if (entityType === 'folder') {
                        const path = findPathById(get().editorElements, entityId);
                        if (!path) return;
                        const node = findNodeInTrees(get().editorElements, path);
                        if (!node) return;
                        const updated = updateNode([...get().editorElements], path, withViewed(node));
                        set(() => ({editorElements: updated}));
                        return;
                    }
                    set((state) => {
                        const collection = state[entityType];
                        const entity = collection[entityId];
                        if (!entity) return {};
                        return {
                            [entityType]: {...collection, [entityId]: withViewed(entity)},
                        };
                    });
                },

                addNewDashboard: async (connectionId: string, editorPath: string[], dashboard?: DashboardState) => {
                    const local_dashboard: DashboardState = dashboard ?? getInitDashboardState();
                    get().addEntity('dashboards', local_dashboard, editorPath);
                },

                addNewRelation: async (connectionId: string, editorPath: string[], relation: RelationState, openTab: boolean = true) => {
                    // make sure that this relation is not already in the state
                    get().addEntity('relations', relation, editorPath, openTab);
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
                addRelationWidgetToDashboard: (dashboardId: string, relationId: string) => {
                    const dashboard = get().dashboards[dashboardId];
                    if (!dashboard) return;
                    const widget = createRelationWidget(relationId);
                    get().addDashboardWidget(dashboardId, widget, appendWidgetToLayouts(dashboard.layouts, widget.id));
                },
                addTextWidgetToDashboard: (dashboardId: string, text: string = '') => {
                    const dashboard = get().dashboards[dashboardId];
                    if (!dashboard) return;
                    const widget = createTextWidget(text);
                    get().addDashboardWidget(dashboardId, widget, appendWidgetToLayouts(dashboard.layouts, widget.id));
                },
                addDashboardWidget: (dashboardId: string, widget: DashboardWidget, layouts: ResponsiveLayouts) => {
                    set((state) => {
                        const dashboard = state.dashboards[dashboardId];
                        if (!dashboard) return {};
                        return {
                            dashboards: {
                                ...state.dashboards,
                                [dashboardId]: {
                                    ...dashboard,
                                    widgets: {...dashboard.widgets, [widget.id]: widget},
                                    layouts,
                                    lastEditedAt: Date.now(),
                                },
                            },
                        };
                    });
                },
                removeDashboardWidget: (dashboardId: string, widgetId: string) => {
                    set((state) => {
                        const dashboard = state.dashboards[dashboardId];
                        if (!dashboard) return {};
                        const widgets = {...dashboard.widgets};
                        delete widgets[widgetId];
                        // drop the widget's layout item from every breakpoint
                        const layouts: ResponsiveLayouts = {};
                        for (const [bp, items] of Object.entries(dashboard.layouts)) {
                            layouts[bp] = (items ?? []).filter((item) => item.i !== widgetId);
                        }
                        return {
                            dashboards: {
                                ...state.dashboards,
                                [dashboardId]: {...dashboard, widgets, layouts, lastEditedAt: Date.now()},
                            },
                        };
                    });
                },
                updateDashboardWidget: (dashboardId: string, widgetId: string, patch: Partial<DashboardWidget>) => {
                    set((state) => {
                        const dashboard = state.dashboards[dashboardId];
                        const widget = dashboard?.widgets[widgetId];
                        if (!dashboard || !widget) return {};
                        return {
                            dashboards: {
                                ...state.dashboards,
                                [dashboardId]: {
                                    ...dashboard,
                                    widgets: {...dashboard.widgets, [widgetId]: {...widget, ...patch, id: widgetId}},
                                    lastEditedAt: Date.now(),
                                },
                            },
                        };
                    });
                },
                setDashboardLayouts: (dashboardId: string, layouts: ResponsiveLayouts) => {
                    set((state) => {
                        const dashboard = state.dashboards[dashboardId];
                        if (!dashboard) return {};
                        return {
                            dashboards: {
                                ...state.dashboards,
                                [dashboardId]: {...dashboard, layouts, lastEditedAt: Date.now()},
                            },
                        };
                    });
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
                        get().addEntity('relations', existingRelation, editorPath);
                    } else {
                        const relationState = RelationActions.create({source});
                        const actions = getRelationActions({mode: 'fullscreen', relationState, updateRelation: get().updateRelation});
                        get().addEntity('relations', relationState, editorPath);
                        await actions.updateRelationDataWithBaseQuery(relationState.query.baseQuery);
                    }
                },

                updateRelation: (newRelation: RelationState) => {
                    // Note: RelationActions dispatch is handled by useRelationActions hook
                    // to work uniformly across standalone, canvas, and dashboard contexts.
                    set((state) => ({
                        relations: {
                            ...state.relations,
                            [newRelation.id]: {...newRelation, lastEditedAt: Date.now()},
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

                deleteEditorElement: (path: string[]) => {

                    const newElements = [...get().editorElements];
                    const newRelations = {...get().relations};
                    const newDashboards = {...get().dashboards};

                    const elementToRemove = findNodeInTrees(newElements, path);
                    if (!elementToRemove) throw new Error('Element to remove not found');

                    // remember what is currently shown so we can leave for the project root if it gets removed
                    const currentlyShown = DashNavigator.instance().isCurrentObjectIdShown(elementToRemove.id);

                    const deletedRelationIds = new Set<string>();
                    IterateAll([elementToRemove], (node) => {
                        if (node.type === 'dashboards') {
                            delete newDashboards[node.id];
                        } else if (node.type === 'relations') {
                            const relation = get().relations[node.id];
                            if (relation) {
                                RelationEvents.delete(relation);
                            }
                            delete newRelations[node.id];
                            deletedRelationIds.add(node.id);
                        }
                    });

                    // purge references to the removed relations from surviving dashboards/canvases
                    const purged = purgeRelationReferences(newDashboards, get().canvas, deletedRelationIds);

                    const updatedFolders = removeNode(newElements, path);
                    set(() => ({
                        editorElements: updatedFolders,
                        relations: newRelations,
                        dashboards: purged.dashboards,
                        canvas: purged.canvas,
                    }));

                    if (currentlyShown) {
                        nav.navigateToLocation(DashLocations.CurrentProjectRoot(), true);
                    }
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

                    // Apply persisted-state migrations (idempotent), in order.
                    migrateV1FlattenRelationState(state);
                    migrateDashboardsToGrid(state);

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