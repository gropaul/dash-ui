import {createJSONStorage, persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {ForceOpenReason} from "@/components/settings/settings-dialog";

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

// Navigation sidebar + other UI-only state, orthogonal to which entity is routed
// in <main> (that lives in the URL, not here).
export interface GUIZustand {
    // Whether the left navigation sidebar is expanded (icons + labels + sections)
    // or collapsed (icons only).
    sidebarExpanded: boolean;
    settings: SettingsGUIZustand;
    // Split ratio (0-1) between a relation view and its config panel. Shared across all relation views.
    configSplitRatio: number;
    // When true, views stretch to full width (no max-width) with a uniform gutter.
    fullWidth: boolean;
}

export interface GUIZustandActions {
    setSidebarExpanded: (expanded: boolean) => void;
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
            sidebarExpanded: true,
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

            setSidebarExpanded: (expanded: boolean) => {
                set({sidebarExpanded: expanded});
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
            version: 3,
            // v1 persisted a serialized flexlayout `layoutModel` + tab fields.
            // v2→v3 dropped the old toggle-based sidebar state (icon rail + resizable panels).
            // Drop all of those; keep settings + the new sidebarExpanded flag.
            migrate: (persistedState: any, _version: number) => {
                if (persistedState && typeof persistedState === "object") {
                    delete persistedState.layoutModel;
                    delete persistedState.selectedTabId;
                    delete persistedState.hasOpenTabs;
                    delete persistedState.number;
                    delete persistedState.selectedSidebarTabs;
                    delete persistedState.mainBarSizeRatio;
                    delete persistedState.sideBarTabsSizeRatios;
                }
                return persistedState;
            },
        }
    )
);
