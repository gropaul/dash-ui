import {Model} from "flexlayout-react";
import {createJSONStorage, persist} from "zustand/middleware";
import {
    addDashboardToLayout,
    addDatabaseToLayout,
    addRelationToLayout,
    addSchemaToLayout,
    focusTab,
    getInitialLayoutModel,
    removeTab,
    renameTab,
} from "@/state/relations/layout-updates";
import {RelationState} from "@/model/relation-state";
import {DashboardState} from "@/model/dashboard-state";
import {DataSourceGroup} from "@/model/data-source-connection";
import {createWithEqualityFn} from "zustand/traditional";
import {ForceOpenReason} from "@/components/settings/settings-view";

export type AvailableTab = 'connections' | 'relations' | 'chat'
export type SettingsTab = 'about' | 'connection' | 'sharing' | 'language-model'

export interface SettingsGUIZustand {
    isOpen: boolean;
    currentTab: SettingsTab;
    forceOpenReasons: ForceOpenReason[];
}

const INITIAL_SETTINGS_STATE: SettingsGUIZustand = {
    isOpen: false,
    currentTab: 'about',
    forceOpenReasons: [],
}

export interface GUIZustand {
    selectedTabId: string | undefined;
    layoutModel: Model;
    mainBarSizeRatio: number;
    sideBarTabsSizeRatios: number[];
    selectedSidebarTabs: AvailableTab[];
    number: number;
    settings: SettingsGUIZustand;
}


export interface GUIZustandActions {
    getModel: () => Model;
    setModel: (model: Model) => void;

    setMainBarSizeRatio: (ratio: number) => void;
    setSideBarTabsSizeRatios: (ratio: number[]) => void;

    setSelectedSidebarTabs: (tabs: AvailableTab[]) => void;

    relationFileDropEnabled: boolean;
    setRelationFileDropEnabled: (enabled: boolean) => void;

    setSettingsOpen: (open: boolean) => void;
    addSettingForceOpenReason: (reason: ForceOpenReason) => void;
    removeSettingForceOpenReason: (reason: ForceOpenReason) => void;
    openSettingsTab: (tab: SettingsTab) => void;


    removeTab(tabId: string): void;

    renameTab(tabId: string, newName: string): void;

    focusTab(tabId: string): void;

    isTabOpen(tabId: string): boolean;

    setSelectedTabId(tabId?: string): void;

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
            return Model.fromJson(value as any);
        }
        return value;
    },
    replacer: (key, value) => {
        if (key === 'layoutModel') {
            return (value as Model).toJson();
        }
        return value;
    }
});

export const useGUIState = createWithEqualityFn<GUIZustandCombined>()(
    persist(
        (set, get) => ({
            layoutModel: getInitialLayoutModel(),
            selectedTabId: undefined,
            number: 0,
            mainBarSizeRatio: 25,
            selectedSidebarTabs: ['relations'],
            sideBarTabsSizeRatios: [70],
            relationFileDropEnabled: true,
            settings: INITIAL_SETTINGS_STATE,

            setRelationFileDropEnabled: (enabled: boolean) => {
                set({relationFileDropEnabled: enabled});
            },

            setSettingsOpen: (open: boolean) => {
                set({
                    settings: {
                        ...get().settings,
                        isOpen: open,
                    }
                });
            },

            addSettingForceOpenReason: (reason: ForceOpenReason) => {
                // if the reason is already present, do not add it again
                const currentReasons = get().settings.forceOpenReasons;
                if (!currentReasons.some(r => r.id === reason.id)) {
                    set((state) => ({
                        settings: {
                            ...state.settings,
                            isOpen: true,
                            currentTab: reason.tab,
                            forceOpenReasons: [...state.settings.forceOpenReasons, reason],
                        }
                    }));
                }
            },
            removeSettingForceOpenReason: (reason: ForceOpenReason) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        forceOpenReasons: state.settings.forceOpenReasons.filter(r => r.id !== reason.id),
                    }
                }));
            },
            openSettingsTab: (tab: SettingsTab) => {
                set({
                    settings: {
                        ...get().settings,
                        isOpen: true,
                        currentTab: tab,
                    }
                });
            },

            setSideBarTabsSizeRatios: (ratios: number[]) => {
                set({sideBarTabsSizeRatios: ratios});
            },

            setSelectedSidebarTabs: (tabs: AvailableTab[]) => {
                set({selectedSidebarTabs: tabs});
            },

            setMainBarSizeRatio: (ratio: number) => {
                set({mainBarSizeRatio: ratio});
            },

            setSelectedTabId: (tabId?: string) => {
                set({selectedTabId: tabId});
            },

            getModel: () => get().layoutModel,
            setModel: (model: Model) => {
                set({layoutModel: model});
            },

            removeTab: (tabId: string) => {
                const model = get().layoutModel;
                removeTab(model, tabId);
                if (get().selectedTabId === tabId) {
                    get().setSelectedTabId(undefined);
                }
                get().persistState();
            },

            keepTabsOfIds: (ids: string[]) => {
                // is called for first application load. It could be the case that the local browser ui state
                // still has tabs from which the contents have been removed. This method is called to remove
                // such tabs.
                const model = get().layoutModel;
                const nodesToRemove: string[] = [];
                model.visitNodes((node) => {
                    // it is a potentially removable tab if the id starts with 'relation'/ 'dashboard' / 'schema' / 'database'
                    const nodeId = node.getId();
                    if (nodeId.startsWith('relation') || nodeId.startsWith('dashboard') || nodeId.startsWith('schema') || nodeId.startsWith('database')) {
                        if (!ids.includes(nodeId)) {
                            nodesToRemove.push(nodeId);
                        }
                    }
                    return;
                });

                nodesToRemove.forEach((nodeId) => {
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
                get().setSelectedTabId(tabId);
                get().persistState();
            },

            addRelationTab: (relation: RelationState) => {
                addRelationToLayout(get().layoutModel, relation);
                get().setSelectedTabId(relation.id);
                get().persistState();
            },

            addDashboardTab: (dashboard: DashboardState) => {
                addDashboardToLayout(get().layoutModel, dashboard);
                get().setSelectedTabId(dashboard.id);
                get().persistState();
            },

            addSchemaTab: (id: string, schema: DataSourceGroup) => {
                addSchemaToLayout(get().layoutModel, id, schema);
                get().setSelectedTabId(id);
                get().persistState();
            },

            addDatabaseTab: (id: string, database: DataSourceGroup) => {
                addDatabaseToLayout(get().layoutModel, id, database);
                get().setSelectedTabId(id);
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
