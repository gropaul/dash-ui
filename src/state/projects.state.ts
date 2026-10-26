import {create} from "zustand";
import {Project} from "@/model/project";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {useEffect} from "react";
import {DEFAULT_STATE_STORAGE_DESTINATION, PROJECT_CONFIG_FILE} from "@/platform/global-data";
import {loadOrSwitchProject} from "@/state/init/load-or-switch-project";
import {useInitState} from "@/state/init.state";
import {ConnectionsService} from "@/state/connections/connections-service";
import {StateStorageInfo} from "@/model/database-connection";
import {projectHost, selectProjectHost} from "@/state/projects/project-hosts";
import {projectConfigText} from "@/state/projects/project-config";
import {useWorkspace} from "@/state/workspace/workspace.state";

interface ProjectsZustand {
    projects: Record<string, Project>;
    // The open project's id; '' while none is open.
    currentProjectId: string;

    getCurrentProject: () => Project | null;
    getCurrentProjectStorageInfo: () => StateStorageInfo;

    doesProjectExists: (id: string) => boolean;
    // Validate a candidate name → an error message, or null when it's fine. The create/rename
    // dialog uses this to gate the submit button; create/rename below assume the caller checked.
    // `exceptId` excludes a project from the duplicate check (so re-saving its own name is fine).
    checkProjectName: (name: string, exceptId?: string) => string | null;
    /** A new project, opened; in Electron a folder named after it in `parent`. */
    createProject: (name: string, parent?: string) => Promise<Project>;
    /** Electron: the project in an existing folder, added to the list and opened. */
    openFolder: (folder: string) => Promise<Project>;
    /** Renames the open project: its `dash.yaml` gets the name. */
    renameProject: (name: string) => Promise<void>;
    /** Takes the project off the list; the caller then lets the host remove it (see ProjectHost.remove). */
    removeProject: (id: string) => void;
    setCurrentProject: (id: string) => void;
    /** The open project's name as its `dash.yaml` has it. */
    adoptProjectName: (id: string, name: string) => void;
}

export const useProjectsState = create<ProjectsZustand>()(
        (set, get) => ({
            projects: {},
            currentProjectId: '',
            getCurrentProject: () => {
                const id = get().currentProjectId;
                return get().projects[id] ?? null;
            },
            getCurrentProjectStorageInfo: () => {
                return {
                    state: "loaded",
                    databaseReadonly: false,
                    databaseStatus: 'permanent',
                    tableStatus: 'found',
                    destination: DEFAULT_STATE_STORAGE_DESTINATION
                }
            },

            doesProjectExists: (id: string) => {
                return get().projects[id] !== undefined;
            },
            checkProjectName: (name, exceptId) => {
                const trimmed = name.trim();
                if (!trimmed) return "Enter a project name.";
                const lower = trimmed.toLowerCase();
                if (Object.values(get().projects).some((p) => p.name.trim().toLowerCase() === lower && p.id !== exceptId)) {
                    return "A project with this name already exists.";
                }
                return null;
            },

            createProject: async (name, parent) => {
                const error = get().checkProjectName(name);
                if (error) throw new Error(error);
                const project = await projectHost().create!(name, parent);
                set((s) => ({projects: {...s.projects, [project.id]: project}}));
                await loadOrSwitchProject(project.id);
                return project;
            },

            openFolder: async (folder) => {
                const project = await projectHost().openFolder!(folder);
                set((s) => ({projects: {...s.projects, [project.id]: {...project, openedAt: Date.now()}}}));
                await loadOrSwitchProject(project.id);
                return project;
            },

            renameProject: async (name) => {
                const project = get().getCurrentProject();
                if (!project) return;
                const error = get().checkProjectName(name, project.id);
                if (error) throw new Error(error);
                get().adoptProjectName(project.id, name.trim());
                const config = useWorkspace.getState().files[PROJECT_CONFIG_FILE];
                await useWorkspace.getState().write(PROJECT_CONFIG_FILE, projectConfigText(config, project.id, name.trim()));
            },

            removeProject: (id) => {
                set((s) => {
                    if (!s.projects[id]) return s;
                    const projects = {...s.projects};
                    delete projects[id];
                    // If we removed the current project, fall back to the most-recently-opened one.
                    let currentProjectId = s.currentProjectId;
                    if (currentProjectId === id) {
                        currentProjectId = Object.values(projects).sort((a, b) => b.openedAt - a.openedAt)[0]?.id ?? '';
                    }
                    return {projects, currentProjectId};
                });
            },

            setCurrentProject: (id) => {
                set((s) => {
                    const project = s.projects[id];
                    if (!project) return s;
                    return {
                        projects: {...s.projects, [id]: {...project, openedAt: Date.now()}},
                        currentProjectId: id,
                    };
                });
            },

            adoptProjectName: (id, name) => {
                set((s) => {
                    const project = s.projects[id];
                    if (!project || project.name === name) return s;
                    return {projects: {...s.projects, [id]: {...project, name}}};
                });
            },
        }),
);

/** Fills the store with the projects of the connection's runtime (see project-hosts.ts). */
export async function loadProjectsIntoStore(): Promise<void> {
    const host = selectProjectHost(ConnectionsService.getInstance().getDatabaseConnection());
    const projects = await host.list();
    useProjectsState.setState({projects: Object.fromEntries(projects.map(p => [p.id, p]))});
}

// Keep the list between sessions whenever it changes (recents in Electron, opened times in the browser).
useProjectsState.subscribe((state, prev) => {
    if (state.projects === prev.projects) return;
    if (!ConnectionsService.getInstance().hasDatabaseConnection()) return;
    projectHost().save(Object.values(state.projects));
});

// E2E-only, like __workspaceStore in workspace.state.ts: the projects registry is not part
// of the relation state, so a test editing sources.sql has no other way to await the commit.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_E2E === '1') {
    (window as unknown as { __projectsStore?: typeof useProjectsState }).__projectsStore = useProjectsState;
}


/**
 * Keeps the loaded project aligned with the URL — the URL is the single source of truth for a
 * project reload. When the URL names a known project id (`/project/<id>/…`) whose project isn't
 * the one currently LOADED, reload it. Everything else (the project list, unknown ids, `/data`) is
 * left alone.
 *
 * The comparison is against the storage seam (`getCurrentProjectStorageId()` = what's actually loaded
 * in the DB), NOT `currentProjectId`. `currentProjectId` is an eagerly-set UI pointer — createProject
 * and removeProject set it before navigating — so gating on it would skip the reload for a freshly
 * created/selected project (the gate would already be satisfied before the URL change fires).
 *
 * Mounted once in AppRouter; it no-ops unless the location is a specific project.
 */
export function useProjectRouteSync(): void {
    const location = useDashLocation();
    // Only reconcile once the initial boot has finished — otherwise we'd race the first-boot pipeline,
    // which is already opening the persisted current project's files. When boot completes this flips
    // and the effect re-runs, so a cold deep-link to another project still switches.
    const initComplete = useInitState((s) => s.currentStep === 'complete');

    useEffect(() => {
        if (location.basePath !== "project") return;
        if (!initComplete) return;
        const state = useProjectsState.getState();
        const match = state.projects[location.projectId];
        if (match && useProjectsState.getState().currentProjectId !== match.id) {
            void loadOrSwitchProject(match.id);
        }
    }, [location, initComplete]);
}

/**
 * The project addressed by the current URL, for chrome (app bar / breadcrumb) that must reflect the
 * URL rather than the loaded project. `project` is the match for `/projects/<id>`; `isUnknown` is true
 * when the URL names a `/projects/<id>` that doesn't resolve to any project (a bogus URL). Both are
 * absent/false for the project list (no project in the URL).
 */
export function useRoutedProject(): { project?: Project; isUnknown: boolean } {
    const location = useDashLocation();
    const projects = useProjectsState((s) => s.projects);
    if (location.basePath !== "project") {
        return {project: undefined, isUnknown: false};
    }
    const project = projects[location.projectId];
    return {project, isUnknown: !project};
}

