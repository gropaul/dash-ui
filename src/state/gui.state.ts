import type {ReactNode} from "react";
import {createJSONStorage, persist} from "zustand/middleware";
import {createWithEqualityFn} from "zustand/traditional";
import {ForceOpenReason} from "@/components/settings/settings-dialog";
import type {WorkspaceNodeKind} from "@/state/workspace/workspace-tree";
import type {PageEditorMode} from "@/components/page-editor/page-editor";

export type SettingsTab = 'about' | 'connection' | 'sharing' | 'agents' | 'documentation' | 'get-started'

// --- Global command palette (file picker) ----------------------------------
// A single palette, opened from anywhere (AppBar search, ⌘K, double-Shift, or a page's
// "Existing query…"). The caller supplies the action label, an optional kind filter and a
// callback; the palette just returns the chosen file, the caller does the work.

export type CommandActionType = 'open' | 'add-query-to-page' | 'move';

/** The kinds of workspace entries the palette can list. */
export type CommandEntityType = Extract<WorkspaceNodeKind, 'folder' | 'page' | 'query' | 'canvas'>;

/** A file or folder the palette hands back. */
export interface CommandFile {
    path: string;
    name: string;
    kind: CommandEntityType;
}

export interface CommandRequest {
    action: CommandActionType;
    // which kinds to show; undefined = all kinds
    filter?: CommandEntityType[];
    // optional element rendered between the search field and the filter tags (e.g. quick-add buttons)
    slot?: ReactNode;
    /** Lists the top level of the workspace (path '') first, as a folder to pick. */
    includeTopLevel?: boolean;
    /** Entries to leave out. */
    exclude?: (file: CommandFile) => boolean;
    onSelect: (file: CommandFile) => void;
}

export interface CommandGUIZustand {
    isOpen: boolean;
    action: CommandActionType;
    filter?: CommandEntityType[];
    slot?: ReactNode;
    includeTopLevel?: boolean;
    exclude?: (file: CommandFile) => boolean;
    onSelect?: (file: CommandFile) => void;
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
    // Width in pixels of the expanded navigation sidebar.
    sidebarWidth: number;
    // When true, views stretch to full width (no max-width) with a uniform gutter.
    fullWidth: boolean;
    // Whether code editors wrap long lines.
    editorWordWrap: boolean;
    // Whether pages open in the editor alone or next to their markdown; view mode is in the URL instead.
    pageEditorMode: Exclude<PageEditorMode, 'view'>;
    // Width (0-1) of the markdown next to the page editor.
    pageMarkdownRatio: number;
    // Whether the right-hand agent chat panel is open.
    agentPanelOpen: boolean;
    // Whether agent chat is offered at all (Settings › Agents).
    agentsEnabled: boolean;
    // The agent the chat starts with, when it is installed.
    preferredAgentId: string | undefined;
    // Global command palette / entity picker (not persisted — see partialize).
    command: CommandGUIZustand;
    // The folders open in the sidebar's workspace tree, per project id.
    workspaceTreeOpen: Record<string, string[]>;
}

export interface GUIZustandActions {
    setSidebarExpanded: (expanded: boolean) => void;
    setConfigSplitRatio: (ratio: number) => void;
    setSidebarWidth: (width: number) => void;
    setFullWidth: (fullWidth: boolean) => void;
    setEditorWordWrap: (wrap: boolean) => void;
    setPageEditorMode: (mode: Exclude<PageEditorMode, 'view'>) => void;
    setPageMarkdownRatio: (ratio: number) => void;
    setAgentPanelOpen: (open: boolean) => void;
    setAgentsEnabled: (enabled: boolean) => void;
    setPreferredAgentId: (agentId: string) => void;

    relationFileDropEnabled: boolean;
    setRelationFileDropEnabled: (enabled: boolean) => void;

    setSettingsOpen: (open: boolean) => void;
    setSettingsCurrentTab: (tab: SettingsTab | undefined) => void;
    addSettingForceOpenReason: (reason: ForceOpenReason) => void;
    removeSettingForceOpenReason: (reason: ForceOpenReason, closeSettingsIfLast?: boolean) => void;
    openSettingsTab: (tab: SettingsTab | undefined) => void;

    openCommand: (request: CommandRequest) => void;
    closeCommand: () => void;

    setWorkspaceFolderOpen: (projectId: string, folderId: string, open: boolean) => void;
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
            sidebarWidth: 240,
            fullWidth: true,
            editorWordWrap: false,
            pageEditorMode: 'edit',
            pageMarkdownRatio: 0.4,
            agentPanelOpen: false,
            agentsEnabled: true,
            preferredAgentId: undefined,
            command: INITIAL_COMMAND_STATE,
            workspaceTreeOpen: {},

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

            setSidebarWidth: (width: number) => {
                set({sidebarWidth: width});
            },

            setFullWidth: (fullWidth: boolean) => {
                set({fullWidth});
            },

            setEditorWordWrap: (wrap: boolean) => {
                set({editorWordWrap: wrap});
            },

            setPageEditorMode: (mode) => {
                set({pageEditorMode: mode});
            },

            setPageMarkdownRatio: (ratio) => {
                set({pageMarkdownRatio: ratio});
            },

            setAgentPanelOpen: (open: boolean) => {
                set({agentPanelOpen: open});
            },

            setAgentsEnabled: (enabled: boolean) => {
                set({agentsEnabled: enabled});
            },

            setPreferredAgentId: (agentId: string) => {
                set({preferredAgentId: agentId});
            },

            openCommand: (request: CommandRequest) => {
                set({
                    command: {
                        isOpen: true,
                        action: request.action,
                        filter: request.filter,
                        slot: request.slot,
                        includeTopLevel: request.includeTopLevel,
                        exclude: request.exclude,
                        onSelect: request.onSelect,
                    }
                });
            },
            closeCommand: () => {
                set((state) => ({command: {...state.command, isOpen: false}}));
            },
            setWorkspaceFolderOpen: (projectId: string, folderId: string, open: boolean) => {
                const ids = get().workspaceTreeOpen[projectId] ?? [];
                if (ids.includes(folderId) === open) return;
                const next = open ? [...ids, folderId] : ids.filter(id => id !== folderId);
                set((state) => ({workspaceTreeOpen: {...state.workspaceTreeOpen, [projectId]: next}}));
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
