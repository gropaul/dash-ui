import {Model} from "flexlayout-react";
import create from "zustand";
import {createJSONStorage, persist, PersistStorage} from "zustand/middleware";
import {
    addDashboardToLayout,
    addDatabaseToLayout,
    addRelationToLayout,
    addSchemaToLayout,
    focusTab,
    getInitialLayoutModel,
    removeTab, renameTab,
} from "@/state/relations/layout-updates";
import {RelationState} from "@/model/relation-state";
import {DashboardState} from "@/model/dashboard-state";
import {DataSourceGroup} from "@/model/connection";

export interface GUIZustand {
    selectedTabId: string | undefined;
    layoutModel: Model;
    number: number;
}

export interface GUIZustandActions {
    getModel: () => Model;
    setModel: (model: Model) => void;

    removeTab(tabId: string): void;

    renameTab(tabId: string, newName: string): void;

    focusTab(tabId: string): void;

    isTabOpen(tabId: string): boolean;

    setSelectedTabId(tabId: string): void;

    addRelationTab(relation: RelationState): void;

    addDashboardTab(dashboard: DashboardState): void;

    addSchemaTab(id: string, schema: DataSourceGroup): void;

    addDatabaseTab(id: string, database: DataSourceGroup): void;

    keepTabsOfIds(ids: string[]): void;

    persistState(): void;

    increment(): void;

}

type GUIZustandCombined = GUIZustand & GUIZustandActions;


const storage = createJSONStorage(() => localStorage, {
    reviver: (key, value) => {
        if (key === 'layoutModel') {
            console.log('reviver', value);
            return Model.fromJson(value as any);
        }
        return value;
    },
    replacer: (key, value) => {
        if (key === 'layoutModel') {
            console.log('replacer', value);
            return (value as Model).toJson();
        }
        return value;
    }
});

export const useGUIState = create<GUIZustandCombined>()(
    persist(
        (set, get) => ({
            layoutModel: getInitialLayoutModel(),
            selectedTabId: undefined,
            number: 0,

            setSelectedTabId: (tabId: string) => {
                set({selectedTabId: tabId});
            },

            getModel: () => get().layoutModel,
            setModel: (model: Model) => {
                set({layoutModel: model});
            },

            removeTab: (tabId: string) => {
                const model = get().layoutModel;
                removeTab(model, tabId);
                get().persistState();
            },

            keepTabsOfIds: (ids: string[]) => {
                // is called for first application load. It could be the case that the local browser ui state
                // still has tabs from which the contents have been removed. This method is called to remove
                // such tabs.
                const model = get().layoutModel;
                const nodesToRemove: string[] = [];
                model.visitNodes( (node) => {
                    // it is a potentially removable tab if the id starts with 'relation'/ 'dashboard' / 'schema' / 'database'
                    const nodeId = node.getId();
                    if (nodeId.startsWith('relation') || nodeId.startsWith('dashboard') || nodeId.startsWith('schema') || nodeId.startsWith('database')) {
                        if (!ids.includes(nodeId)) {
                            nodesToRemove.push(nodeId);
                        }
                    }
                    return;
                });

                nodesToRemove.forEach( (nodeId) => {
                    console.warn('Removing tab because of the underlying data has been removed', nodeId);
                    removeTab(model, nodeId);
                });

            },

            renameTab: (tabId: string, newName: string) => {
                const model = get().layoutModel;
                // Note: The original code calls removeTab; adjust as needed.
                renameTab(model, tabId, newName);
                get().persistState();
            },

            focusTab: (tabId: string) => {
                const model = get().layoutModel;
                focusTab(model, tabId);
                get().persistState();
            },

            addRelationTab: (relation: RelationState) => {
                addRelationToLayout(get().layoutModel, relation);
                get().persistState();
            },

            addDashboardTab: (dashboard: DashboardState) => {
                addDashboardToLayout(get().layoutModel, dashboard);
                get().persistState();
            },

            addSchemaTab: (id: string, schema: DataSourceGroup) => {
                addSchemaToLayout(get().layoutModel, id, schema);
                get().persistState();
            },

            addDatabaseTab: (id: string, database: DataSourceGroup) => {
                addDatabaseToLayout(get().layoutModel, id, database);
                get().persistState();
            },


            increment: () => {
                set((state) => ({number: state.number + 1}));
            },

            isTabOpen(tabId: string): boolean {
                const model = get().layoutModel;
                return model.getNodeById(tabId) !== undefined
            },

            persistState: () => {
                // trigger persistence of the layout
                set((state) => ({number: state.number + 1}));
            },
        }),
        {
            name: "gui-state", // The key used in localStorage
            storage: storage,
        }
    )
);


