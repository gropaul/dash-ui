import {useEffect} from "react";
import {Project} from "@/model/project";
import {PROJECT_CONFIG_FILE} from "@/platform/global-data";
import {useProjectsState} from "@/state/projects.state";
import {useDashLocation} from "@/state/routing/use-dash-location";
import {loadOrSwitchProject} from "@/state/init/load-or-switch-project";
import {useInitState} from "@/state/init.state";
import {ConnectionsService} from "@/state/connections/connections-service";
import {projectHost, selectProjectHost} from "@/state/projects/project-hosts";
import {projectConfigText} from "@/state/projects/project-config";
import {useWorkspace} from "@/state/workspace/workspace.state";

/** A new project, opened; in Electron a folder named after it in `parent`. */
export async function createProject(name: string, parent?: string): Promise<Project> {
    const error = useProjectsState.getState().checkProjectName(name);
    if (error) throw new Error(error);
    const project = await projectHost().create!(name, parent);
    useProjectsState.setState((s) => ({projects: {...s.projects, [project.id]: project}}));
    await loadOrSwitchProject(project.id);
    return project;
}

/** Electron: the project in an existing folder, added to the list and opened. */
export async function openFolderAsProject(folder: string): Promise<Project> {
    const project = await projectHost().openFolder!(folder);
    useProjectsState.setState((s) => ({projects: {...s.projects, [project.id]: {...project, openedAt: Date.now()}}}));
    await loadOrSwitchProject(project.id);
    return project;
}

/** Renames the open project: its `dash.yaml` gets the name. */
export async function renameCurrentProject(name: string): Promise<void> {
    const state = useProjectsState.getState();
    const project = state.getCurrentProject();
    if (!project) return;
    const error = state.checkProjectName(name, project.id);
    if (error) throw new Error(error);
    state.adoptProjectName(project.id, name.trim());
    const config = useWorkspace.getState().files[PROJECT_CONFIG_FILE];
    await useWorkspace.getState().write(PROJECT_CONFIG_FILE, projectConfigText(config, project.id, name.trim()));
}

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
