import type {ReactNode} from "react";
import {createJSONStorage, persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {ForceOpenReason} from "@/components/settings/settings-dialog";
import {EntityBase} from "@/state/entities/entity-base";

export type SettingsTab = 'about' | 'connection' | 'sharing' | 'language-model' | 'documentation' | 'get-started'

// --- Global command palette (entity picker) --------------------------------
// A single palette, opened from anywhere (AppBar search, ⌘K, double-Shift, or the
// "Add to …" actions). The caller supplies the action label, an optional type
// filter, and a callback; the palette just returns the chosen entity — the caller
// performs the actual work (navigate, add-to-canvas, …).

export type CommandActionType = 'open' | 'add-relation-to-dashboard' | 'add-relation-to-canvas' | 'move';

/** Entity kinds the palette can list (mirrors the folder-view element kinds). */
export type CommandEntityType = 'folder' | 'relations' | 'dashboards' | 'canvas';

/** A pinned row shown above the results (e.g. the "Workspace" root target in move mode). */
export interface CommandRootOption {
    label: string;
    onSelect: () => void;
}

export interface CommandRequest {
    action: CommandActionType;
    // which entity kinds to show; undefined = all kinds
    filter?: CommandEntityType[];
    // entity ids to hide from the list (e.g. a move can't target itself or its own subtree)
    excludeIds?: string[];
    // show each row's full breadcrumb path (used by move, where identical folder names collide)
    showPaths?: boolean;
    // optional pinned row rendered above the results
    rootOption?: CommandRootOption;
    // optional element rendered between the search field and the filter tags (e.g. quick-add buttons)
    slot?: ReactNode;
    onSelect: (entity: EntityBase) => void;
}

export interface CommandGUIZustand {
    isOpen: boolean;
    action: CommandActionType;
    filter?: CommandEntityType[];
    excludeIds?: string[];
    showPaths?: boolean;
    rootOption?: CommandRootOption;
    slot?: ReactNode;
    onSelect?: (entity: EntityBase) => void;
}

const INITIAL_COMMAND_STATE: CommandGUIZustand = {
    isOpen: false,
    action: 'open',
}

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
    sidebarSplitRatio: number;
    // When true, views stretch to full width (no max-width) with a uniform gutter.
    fullWidth: boolean;
    // Global command palette / entity picker (not persisted — see partialize).
    command: CommandGUIZustand;
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

    openCommand: (request: CommandRequest) => void;
    closeCommand: () => void;
}

type GUIZustandCombined = GUIZustand & GUIZustandActions;

const storage = createJSONStorage(() => localStorage);

export const useGUIState = createWithEqualityFn<GUIZustandCombined>()(
    persist(
        (set, get) => ({
            sidebarExpanded: true,
            relationFileDropEnabled: true,
            settings: INITIAL_SETTINGS_STATE,
            sidebarSplitRatio: 0.3,
            fullWidth: true,
            command: INITIAL_COMMAND_STATE,

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
                set({sidebarSplitRatio: ratio});
            },

            setFullWidth: (fullWidth: boolean) => {
                set({fullWidth});
            },

            openCommand: (request: CommandRequest) => {
                set({
                    command: {
                        isOpen: true,
                        action: request.action,
                        filter: request.filter,
                        excludeIds: request.excludeIds,
                        showPaths: request.showPaths,
                        rootOption: request.rootOption,
                        slot: request.slot,
                        onSelect: request.onSelect,
                    }
                });
            },
            closeCommand: () => {
                set((state) => ({command: {...state.command, isOpen: false}}));
            },
        }),
        {
            name: "gui-state", // The key used in localStorage
            storage: storage,
            version: 3,
            // The command palette holds a live callback and transient open-state — never persist it.
            partialize: (state) => {
                const {command, ...rest} = state;
                return rest;
            },
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
