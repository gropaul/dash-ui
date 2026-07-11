import {createJSONStorage, persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {ForceOpenReason} from "@/components/settings/settings-dialog";

export type AvailableTab = 'connections' | 'relations' | 'chat'
export type SettingsTab = 'about' | 'connection' | 'sharing' | 'language-model' | 'documentation' | 'get-started'

export interface SettingsGUIZustand {
    isOpen: boolean;
    currentTab: SettingsTab | undefined;
    forceOpenReasons: ForceOpenReason[];
}

const INITIAL_SETTINGS_STATE: SettingsGUIZustand = {
    isOpen: false,
    currentTab: 'about',
    forceOpenReasons: [],
}

// Which side panels are open + panel sizing. This is UI-only state, orthogonal
// to which entity is routed in <main> (that lives in the URL, not here).
export interface GUIZustand {
    mainBarSizeRatio: number;
    sideBarTabsSizeRatios: number[];
    selectedSidebarTabs: AvailableTab[];
    settings: SettingsGUIZustand;
    // Split ratio (0-1) between a relation view and its config panel. Shared across all relation views.
    configSplitRatio: number;
    // When true, views stretch to full width (no max-width) with a uniform gutter.
    fullWidth: boolean;
}

export interface GUIZustandActions {
    setMainBarSizeRatio: (ratio: number) => void;
    setSideBarTabsSizeRatios: (ratio: number[]) => void;
    setSelectedSidebarTabs: (tabs: AvailableTab[]) => void;
    setConfigSplitRatio: (ratio: number) => void;
    setFullWidth: (fullWidth: boolean) => void;

    relationFileDropEnabled: boolean;
    setRelationFileDropEnabled: (enabled: boolean) => void;

    setSettingsOpen: (open: boolean) => void;
    setSettingsCurrentTab: (tab: SettingsTab | undefined) => void;
    addSettingForceOpenReason: (reason: ForceOpenReason) => void;
    removeSettingForceOpenReason: (reason: ForceOpenReason, closeSettingsIfLast?: boolean) => void;
    openSettingsTab: (tab: SettingsTab | undefined) => void;
}

type GUIZustandCombined = GUIZustand & GUIZustandActions;

const storage = createJSONStorage(() => localStorage);

export const useGUIState = createWithEqualityFn<GUIZustandCombined>()(
    persist(
        (set, get) => ({
            mainBarSizeRatio: 25,
            selectedSidebarTabs: ['relations'],
            sideBarTabsSizeRatios: [70],
            relationFileDropEnabled: true,
            settings: INITIAL_SETTINGS_STATE,
            configSplitRatio: 0.3,
            fullWidth: true,

            setRelationFileDropEnabled: (enabled: boolean) => {
                set({relationFileDropEnabled: enabled});
            },

            setSettingsOpen: (open: boolean) => {
                set({settings: {...get().settings, isOpen: open}});
            },

            setSettingsCurrentTab: (tab: SettingsTab | undefined) => {
                set({settings: {...get().settings, currentTab: tab}});
            },

            addSettingForceOpenReason: (reason: ForceOpenReason) => {
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
            removeSettingForceOpenReason: (reason: ForceOpenReason, closeSettingsIfLast: boolean = false) => {
                const newReasons = [...get().settings.forceOpenReasons].filter(r => r.id !== reason.id);
                let settingsOpen = get().settings.isOpen;
                if (newReasons.length === 0 && closeSettingsIfLast && settingsOpen) {
                    settingsOpen = false;
                }

                set((state) => ({
                    settings: {
                        ...state.settings,
                        forceOpenReasons: newReasons,
                        isOpen: settingsOpen,
                    }
                }));
            },
            openSettingsTab: (tab: SettingsTab | undefined) => {
                set({settings: {...get().settings, isOpen: true, currentTab: tab}});
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

            setConfigSplitRatio: (ratio: number) => {
                set({configSplitRatio: ratio});
            },

            setFullWidth: (fullWidth: boolean) => {
                set({fullWidth});
            },
        }),
        {
            name: "gui-state", // The key used in localStorage
            storage: storage,
            version: 2,
            // v1 persisted a serialized flexlayout `layoutModel` + tab fields.
            // Drop those; keep sidebar/settings state.
            migrate: (persistedState: any, _version: number) => {
                if (persistedState && typeof persistedState === "object") {
                    delete persistedState.layoutModel;
                    delete persistedState.selectedTabId;
                    delete persistedState.hasOpenTabs;
                    delete persistedState.number;
                }
                return persistedState;
            },
        }
    )
);
