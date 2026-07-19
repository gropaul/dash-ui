import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {DEFAULT_PROJECT_ICON, Project, ProjectIconKey} from "@/model/project";
import {slugify} from "@/platform/string-utils";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {useEffect} from "react";

// A single seeded project so the app always has a current project (WASM has no folder to
// derive a name from). Fixed id so it isn't duplicated across reloads before persistence.
const DEFAULT_PROJECT_ID = "default";

function makeDefaultProject(): Project {
    const now = Date.now();
    return {
        id: DEFAULT_PROJECT_ID,
        name: "Untitled project",
        slug: "untitled",
        icon: DEFAULT_PROJECT_ICON,
        rootPath: "/",
        createdAt: now,
        openedAt: now,
    };
}

export interface CreateProjectInput {
    name: string;
    icon?: ProjectIconKey;
    rootPath?: string;
}

/** Result of validating a candidate project name: the derived slug (if any) + a reason it's rejected. */
export interface ProjectNameCheck {
    slug: string | null;
    error: string | null;
}

interface ProjectsZustand {
    projects: Record<string, Project>;
    currentProjectId: string;


    getCurrentProject: () => Project;
    // Validate a candidate name → {slug, error}. The create/rename dialog uses this to preview the
    // slug and gate the submit button; create/rename below assume the caller has already checked.
    // `exceptId` excludes a project from the duplicate check (so re-saving its own name is fine).
    checkProjectName: (name: string, exceptId?: string) => ProjectNameCheck;
    createProject: (input: CreateProjectInput) => Project;
    renameProject: (id: string, name: string) => void;
    setProjectIcon: (id: string, icon: ProjectIconKey) => void;
    removeProject: (id: string) => void;
    selectProject: (id: string) => void;
}

export const useProjectsState = create<ProjectsZustand>()(
    persist(
        (set, get) => ({
            projects: {[DEFAULT_PROJECT_ID]: makeDefaultProject()},
            currentProjectId: DEFAULT_PROJECT_ID,
            getCurrentProject: () => {
                const id = get().currentProjectId;
                return get().projects[id];
            },
            checkProjectName: (name, exceptId) => {
                const trimmed = name.trim();
                if (!trimmed) return {slug: null, error: "Enter a project name."};
                const slug = slugify(trimmed);
                if (!slug) return {slug: null, error: "Use at least one letter or number."};
                if (Object.values(get().projects).some((p) => p.slug === slug && p.id !== exceptId)) {
                    return {slug, error: "A project with this slug already exists."};
                }
                return {slug, error: null};
            },

            createProject: ({name, icon, rootPath}) => {
                const {slug, error} = get().checkProjectName(name);
                if (error || !slug) throw new Error(error ?? "Invalid project name");
                const now = Date.now();
                const project: Project = {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    slug,
                    icon: icon ?? DEFAULT_PROJECT_ICON,
                    // No filesystem in WASM mode, so default to the virtual root.
                    rootPath: rootPath ?? "/",
                    createdAt: now,
                    openedAt: now,
                };
                set((s) => ({
                    projects: {...s.projects, [project.id]: project},
                    currentProjectId: project.id,
                }));
                return project;
            },

            renameProject: (id, name) => {
                const {slug, error} = get().checkProjectName(name, id);
                if (error || !slug) throw new Error(error ?? "Invalid project name");
                set((s) => {
                    const project = s.projects[id];
                    if (!project) return s;
                    return {projects: {...s.projects, [id]: {...project, name: name.trim(), slug}}};
                });
            },

            setProjectIcon: (id, icon) => {
                set((s) => {
                    const project = s.projects[id];
                    if (!project) return s;
                    return {projects: {...s.projects, [id]: {...project, icon}}};
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

            selectProject: (id) => {
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
        {
            name: "projects-state",
            storage: createJSONStorage(() => localStorage),
            version: 1,
        },
    ),
);


/**
 * Keeps the current project aligned with the URL — the URL is the source of truth. When the
 * URL addresses an object under a known project slug (`/projects/<slug>/…`) that isn't the
 * current one, select it. Everything else (the project list, unknown slugs, `/`) is left
 * alone — bootstrapping/registering a project from an arbitrary path is a later concern.
 *
 * Mounted once in AppRouter; it no-ops unless the location is a project object.
 */
export function useProjectRouteSync(): void {
    const location = useDashLocation();

    useEffect(() => {
        if (location.basePath !== "object") return;
        const state = useProjectsState.getState();
        const match = Object.values(state.projects).find((p) => p.slug === location.projectSlug);
        if (match && state.currentProjectId !== match.id) {
            state.selectProject(match.id);
        }
    }, [location]);
}