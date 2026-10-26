import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {setDatabaseConnection} from "@/state/init/initialize-connections";
import {StorageDuckAPI} from "@/state/persistency/duckdb-storage";
import {getInitialRelationDataZustandState, useCacheStore, useRelationDataState} from "@/state/relations-data.state";
import {useInitState} from "@/state/init.state";
import {ContentLifecycle} from "@/state/content-lifecycle";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {BlobBackend} from "@/state/workspace/blob-backend";
import {FolderBackend} from "@/state/workspace/folder-backend";
import {WorkspaceBackend} from "@/state/workspace/workspace-backend";
import {DatabaseConnection} from "@/model/database-connection";
import {initProjectSources, teardownProjectSources} from "@/state/sources/replay-sources";
import {useProjectsState} from "@/state/projects.state";
import {
    DASH_CATALOG_CACHE,
    DASH_CATALOG_STATE,
    DASH_CATALOG_TEMP,
    DASH_INTERNAL_SCHEMAS,
    DASH_STORAGE_VERSION,
    WORKSPACE_STORAGE_DESTINATION,
    getProjectCacheFileName
} from "@/platform/global-data";
import {followQueryMacros, registerQueryMacros} from "@/state/workspace/query-macros";
import {loadProjectMeta, saveProjectMeta} from "@/state/projects/project-meta-storage";
import {Project, ProjectMeta} from "@/model/project";

/**
 * Tear down the outgoing project's in-memory state so the incoming project starts clean: shows the init
 * loading splash (a non-'complete' step), empties the workspace and the results, and cancels any pending
 * throttled write so nothing clobbers the new file.
 */
let stopFollowing: (() => void)[] = [];

function closeOldProject(): void {
    stopFollowing.forEach(stop => stop());
    stopFollowing = [];
    useInitState.getState().setStep('closing-current-project');
    useWorkspace.getState().unload();
    useRelationDataState.setState(getInitialRelationDataZustandState());
    useCacheStore.getState().clear();
    useProjectsState.getState().setCurrentMeta(null);
    StorageDuckAPI.resetForProjectSwitch();
}

/**
 * The meta row of the freshly attached project file, mirrored from the registry: the registry is the
 * local truth for name and icon, the file copy exists so they travel with a shared file. A fresh file
 * gets a row seeded from the registry entry.
 */
async function loadOrSeedProjectMeta(project: Project): Promise<ProjectMeta> {
    const stored = await loadProjectMeta();
    const meta: ProjectMeta = {
        ...(stored ?? {sourcesSql: "", createdAt: Date.now(), layoutVersion: DASH_STORAGE_VERSION}),
        name: project.name,
        icon: project.icon,
    };
    if (!stored || stored.name !== meta.name || stored.icon !== meta.icon) await saveProjectMeta(meta);
    return meta;
}

/**
 * Point the app at `projectId`, reopen its file and cache database, replay its sources, and
 * rehydrate its workspace.
 *
 *   1. Re-attach the project catalog (`dash`, the project file) and the cache catalog against the new
 *      project's files (WASM registers the OPFS handles first) and make `dash` the default catalog, so
 *      unqualified `CREATE TABLE` lands in the project file.
 *   2. Read the file's meta row (seeding it from the registry for a fresh file), then replay its
 *      `sources.sql` (ATTACH / CREATE VIEW / secrets) so its data is back before relations run.
 *   3. Rehydrate relation state + last-used from the file. The rehydrate pipeline
 *      (onRelationStateLoadedFromConnection) drives the init step back to 'complete', hiding the splash.
 */
async function loadProject(projectId: string, connection: DatabaseConnection): Promise<void> {

    const project = useProjectsState.getState().projects[projectId];
    if (!project) throw new Error(`Unknown project ${projectId}`);
    useProjectsState.getState().setCurrentProject(projectId);

    // create a temporary database in memory that we can use for detaching the others
    await connection.executeQuery(`ATTACH IF NOT EXISTS ':memory:' as ${DASH_CATALOG_TEMP};`, false, false);
    await connection.executeQuery(`USE ${DASH_CATALOG_TEMP};`, false, false);

    // now we can safely detach
    await connection.executeQuery(`DETACH DATABASE IF EXISTS ${DASH_CATALOG_CACHE};`, false, false);
    await connection.executeQuery(`DETACH DATABASE IF EXISTS ${DASH_CATALOG_STATE};`, false, false);

    const root = await connection.getStorageRoot();
    const projectPath = root + project.location;
    const cachePath = root + getProjectCacheFileName(projectId);

    console.log(`Loading project ${projectId} from ${projectPath} (cache: ${cachePath})`);

    if (connection.type === 'duckdb-wasm') {
        const wasm = DuckdbWasmProvider.getInstance();
        await wasm.attachDatabase(projectPath, DASH_CATALOG_STATE);
        await wasm.attachDatabase(cachePath, DASH_CATALOG_CACHE);
    } else {
        await connection.executeQuery(`ATTACH IF NOT EXISTS '${projectPath}' AS ${DASH_CATALOG_STATE};`, false, false);
        await connection.executeQuery(`ATTACH IF NOT EXISTS '${cachePath}' AS ${DASH_CATALOG_CACHE};`, false, false);
    }

    for (const schema of DASH_INTERNAL_SCHEMAS) {
        await connection.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${DASH_CATALOG_STATE}.${schema};`, false);
    }
    await connection.executeQuery(`USE ${DASH_CATALOG_STATE};`, false, false);

    // Replay the project's data sources before loading the queries that may read them.
    useInitState.getState().setStep('loading-project-connections');
    useProjectsState.getState().setCurrentMeta(await loadOrSeedProjectMeta(project));
    await initProjectSources();

    useInitState.getState().setStep('loading-project-relations');
    await useWorkspace.getState().load(await workspaceBackend(project, root));

    useInitState.getState().setStep('loading-project-macros');
    await registerQueryMacros(useWorkspace.getState().files);
    stopFollowing = [followQueryMacros(), ContentLifecycle.followRemovedFiles()];

    useInitState.getState().setStep('loading-project-cached-results');
    await ContentLifecycle.onProjectLoad(useWorkspace.getState().files);
    await useRelationDataState.getState().loadLastUsed();
}

/** Electron keeps the files in the project's folder, the browser in the project's DuckDB. */
async function workspaceBackend(project: Project, storageRoot: string): Promise<WorkspaceBackend> {
    const native = typeof window !== 'undefined' ? window.dashNative : undefined;
    if (native) return new FolderBackend(native.workspace, projectFolder(project, storageRoot));
    const storage = await StorageDuckAPI.getInstance(WORKSPACE_STORAGE_DESTINATION);
    return new BlobBackend(storage, () => useWorkspace.getState().snapshot());
}

/** The project's chosen folder, or by default one named after its id next to its DuckDB files. */
export function projectFolder(project: Project, storageRoot: string): string {
    return project.rootPath && project.rootPath !== "/" ? project.rootPath : storageRoot + project.id;
}

/**
 * Re-point the app at a different project: close the old one, then load the new one.
 *
 * Switches are serialized (see {@link loadOrSwitchProject}) so overlapping calls — e.g. rapid project
 * navigation — can't interleave the destroy/reopen of the WASM database.
 */
async function runLoadOrSwitchProject(projectId: string, reload: boolean): Promise<void> {
    if (!reload && useProjectsState.getState().currentProjectId === projectId) return;

    // first close the old project
    const connection = ConnectionsService.getInstance().getDatabaseConnection();
    closeOldProject();

    // then update the local state
    try {
        // undo the outgoing project's sources, else a database attached by A stays attached under B
        await teardownProjectSources();
        await loadProject(projectId, connection);
    } catch (e) {
        // Never leave the app stuck on the loading splash if the swap fails.
        console.error("Failed to switch project:", projectId, e);
    }
    useInitState.getState().setStep('complete');
}

// Serialize switches: chain each call after the previous one (regardless of success/failure) so two
// switches can't interleave the WASM destroy/reopen. Callers fire-and-forget via `void switchProject`.
let pendingSwitch: Promise<void> = Promise.resolve();

/** `reload` reopens the project even when it is the current one, e.g. after its folder changed. */
export function loadOrSwitchProject(projectId: string, reload = false): Promise<void> {
    pendingSwitch = pendingSwitch.then(
        () => runLoadOrSwitchProject(projectId, reload),
        () => runLoadOrSwitchProject(projectId, reload),
    );
    return pendingSwitch;
}
