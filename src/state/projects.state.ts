import {create} from "zustand";
import {Project} from "@/model/project";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {DEFAULT_STATE_STORAGE_DESTINATION} from "@/platform/global-data";
import {StateStorageInfo} from "@/model/database-connection";

interface ProjectsZustand {
    projects: Record<string, Project>;
    // The open project's id; '' while none is open.
    currentProjectId: string;

    getCurrentProject: () => Project | null;
    getCurrentProjectStorageInfo: () => StateStorageInfo;

    doesProjectExists: (id: string) => boolean;
    // Validate a candidate name → an error message, or null when it's fine. The create/rename
    // dialog uses this to gate the submit button; createProject/renameCurrentProject assume the caller checked.
    // `exceptId` excludes a project from the duplicate check (so re-saving its own name is fine).
    checkProjectName: (name: string, exceptId?: string) => string | null;
    /** Takes the project off the list; the caller then lets the host remove it (see ProjectHost.remove). */
    removeProject: (id: string) => void;
    setCurrentProject: (id: string) => void;
    /** The open project's name as its `dash.yaml` has it. */
    adoptProjectName: (id: string, name: string) => void;
}

/**
 * The project list and which project is open. Loading, creating and opening projects, which need the project hosts
 * and the database, are in projects/project-actions.ts.
 */
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

// E2E-only, like __workspaceStore in workspace.state.ts: the projects registry is not part
// of the relation state, so a test editing sources.sql has no other way to await the commit.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_E2E === '1') {
    (window as unknown as { __projectsStore?: typeof useProjectsState }).__projectsStore = useProjectsState;
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

