import {create} from "zustand";
import {DEFAULT_PROJECT_ICON, Project, ProjectIconKey} from "@/model/project";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {useEffect} from "react";
import {
    DASH_CATALOG_PROJECTS,
    DASH_PROJECTS_DATABASE_NAME,
    DEFAULT_PROJECT_ID,
    DEFAULT_STATE_STORAGE_DESTINATION
} from "@/platform/global-data";
import {loadOrSwitchProject} from "@/state/init/load-or-switch-project";
import {useInitState} from "@/state/init.state";
import {loadProjectsRegistry, saveProjectsRegistry} from "@/state/projects/project-registry-storage";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {StateStorageInfo} from "@/model/database-connection";

// A single seeded project so the app always has a current project (WASM has no folder to
// derive a name from). Fixed id so it isn't duplicated across reloads before persistence.

function makeDefaultProject(): Project {
    const now = Date.now();
    return {
        id: DEFAULT_PROJECT_ID,
        name: "Untitled project",
        icon: DEFAULT_PROJECT_ICON,
        rootPath: "/",
        createdAt: now,
        openedAt: now,
        sourcesSql: "",
    };
}

export interface CreateProjectInput {
    name: string;
    icon?: ProjectIconKey;
    rootPath?: string;
}

interface ProjectsZustand {
    projects: Record<string, Project>;
    currentProjectId: string;


    getCurrentProject: () => Project | null;
    getCurrentProjectStorageInfo: () => StateStorageInfo;

    doesProjectExists: (id: string) => boolean;
    // Validate a candidate name → an error message, or null when it's fine. The create/rename
    // dialog uses this to gate the submit button; create/rename below assume the caller checked.
    // `exceptId` excludes a project from the duplicate check (so re-saving its own name is fine).
    checkProjectName: (name: string, exceptId?: string) => string | null;
    createProject: (input: CreateProjectInput) => Promise<Project>;
    renameProject: (id: string, name: string) => void;
    setProjectIcon: (id: string, icon: ProjectIconKey) => void;
    setProjectSources: (id: string, sourcesSql: string) => void;
    removeProject: (id: string) => void;
    setCurrentProject: (id: string) => void;
}

export const useProjectsState = create<ProjectsZustand>()(
        (set, get) => ({
            projects: {[DEFAULT_PROJECT_ID]: makeDefaultProject()},
            currentProjectId: DEFAULT_PROJECT_ID,
            getCurrentProject: () => {
                const id = get().currentProjectId;
                return get().projects[id];
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

            createProject: async ({name, icon, rootPath}) => {
                const error = get().checkProjectName(name);
                if (error) throw new Error(error);
                const now = Date.now();
                const project: Project = {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    icon: icon ?? DEFAULT_PROJECT_ICON,
                    // No filesystem in WASM mode, so default to the virtual root.
                    rootPath: rootPath ?? "/",
                    createdAt: now,
                    openedAt: now,
                    sourcesSql: "",
                };
                set((s) => ({
                    projects: {...s.projects, [project.id]: project},
                }));
                await loadOrSwitchProject(project.id);
                return project;
            },

            renameProject: (id, name) => {
                const error = get().checkProjectName(name, id);
                if (error) throw new Error(error);
                set((s) => {
                    const project = s.projects[id];
                    if (!project) return s;
                    return {projects: {...s.projects, [id]: {...project, name: name.trim()}}};
                });
            },

            setProjectIcon: (id, icon) => {
                set((s) => {
                    const project = s.projects[id];
                    if (!project) return s;
                    return {projects: {...s.projects, [id]: {...project, icon}}};
                });
            },

            setProjectSources: (id, sourcesSql) => {
                set((s) => {
                    const project = s.projects[id];
                    if (!project) return s;
                    return {projects: {...s.projects, [id]: {...project, sourcesSql}}};
                });
            },

            removeProject: (id) => {
                set((s) => {
                    if (!s.projects[id]) return s;
                    const projects = {...s.projects};
                    delete projects[id];
                    // Never leave zero projects; re-seed a default if this was the last one.
                    if (Object.keys(projects).length === 0) {
                        const fresh = makeDefaultProject();
                        return {projects: {[fresh.id]: fresh}, currentProjectId: fresh.id};
                    }
                    // If we removed the current project, fall back to the most-recently-opened one.
                    let currentProjectId = s.currentProjectId;
                    if (currentProjectId === id) {
                        currentProjectId = Object.values(projects)
                            .sort((a, b) => b.openedAt - a.openedAt)[0].id;
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
        }),
);

// loads the projects from DASH_PROJECTS_DATABASE_NAME to useProjectsState
export async function loadProjectsIntoStore(): Promise<void> {

    // ATTACH the projects database so we can read the registry row
    const connection = ConnectionsService.getInstance().getDatabaseConnection();
    const root = await connection.getStorageRoot();
    const db_path = `${root}${DASH_PROJECTS_DATABASE_NAME}`;
    console.log(`Loading ${DASH_PROJECTS_DATABASE_NAME} at ${db_path}`);

    if (connection.type === 'duckdb-wasm'){
        await DuckdbWasmProvider.getInstance().attachDatabase(db_path, DASH_CATALOG_PROJECTS);
    } else {
        await connection.executeQuery(`ATTACH IF NOT EXISTS '${db_path}' AS ${DASH_CATALOG_PROJECTS} (READ_WRITE);`, false, false);
    }

    console.log(`Attached ${DASH_PROJECTS_DATABASE_NAME}`);

    const loaded = await loadProjectsRegistry();
    if (loaded.status === 'ok') {
        useProjectsState.setState({projects: loaded.projects});
    } else {
        // First run on this connection: seed a FRESH default. (Not the in-memory list — on a
        // connection switch that would copy the previous backend's projects into this one.)
        // Persist so the meta file has a starting point.
        const projects = {};
        useProjectsState.setState({projects});
        await saveProjectsRegistry(projects);
    }
}

// Persist the registry whenever the project list changes — but only after the initial load (so we
// don't immediately re-save what we just read) and only once a connection exists to write to.
// `currentProjectId` is intentionally excluded: it's a runtime pointer derived from the URL.
useProjectsState.subscribe((state, prev) => {
    if (state.projects === prev.projects) return;
    if (!ConnectionsService.getInstance().hasDatabaseConnection()) return;
    void saveProjectsRegistry(state.projects);
});

// E2E-only, same hook as __relationsStore in relations.state.ts: the projects registry is not part
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

/** (the default DuckDB catalog: user tables). */
export function getProjectDataFileName(projectId: string): string {
    return `${projectId}-dash-project-data.duckdb`;
}

/** (cache tables + persisted relation state + macros). */
export function getProjectDashStateFileName(projectId: string): string {
    return `${projectId}-dash-project-state.duckdb`;
}