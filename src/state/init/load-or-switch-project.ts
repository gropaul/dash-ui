import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {getInitialRelationDataZustandState, useCacheStore, useRelationDataState} from "@/state/relations-data.state";
import {useInitState} from "@/state/init.state";
import {ContentLifecycle} from "@/state/content-lifecycle";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {DatabaseConnection} from "@/model/database-connection";
import {initProjectSources, teardownProjectSources} from "@/state/sources/replay-sources";
import {useProjectsState} from "@/state/projects.state";
import {projectHost} from "@/state/projects/project-hosts";
import {parseProjectConfig, projectConfigText} from "@/state/projects/project-config";
import {
    DASH_CATALOG_CACHE,
    DASH_CATALOG_STATE,
    DASH_CATALOG_TEMP,
    DASH_INTERNAL_SCHEMAS,
    getProjectCacheFileName,
    getProjectFileName,
    PROJECT_CONFIG_FILE
} from "@/platform/global-data";
import {followQueryMacros, registerQueryMacros} from "@/state/workspace/query-macros";
import {Project} from "@/model/project";
import {toast} from "sonner";

/**
 * Tear down the outgoing project's in-memory state so the incoming project starts clean: shows the init
 * loading splash (a non-'complete' step), empties the workspace and the results.
 */
let stopFollowing: (() => void)[] = [];

function closeOldProject(): void {
    stopFollowing.forEach(stop => stop());
    stopFollowing = [];
    useInitState.getState().setStep('closing-current-project');
    useWorkspace.getState().unload();
    useRelationDataState.setState(getInitialRelationDataZustandState());
    useCacheStore.getState().clear();
}

/** The open project's `dash.yaml`: written when the folder has none, and the name taken from it. */
async function syncProjectConfig(project: Project): Promise<void> {
    const text = useWorkspace.getState().files[PROJECT_CONFIG_FILE];
    const config = parseProjectConfig(text);
    if (config.id !== project.id || !config.name) {
        await useWorkspace.getState().write(PROJECT_CONFIG_FILE, projectConfigText(text, project.id, config.name ?? project.name));
    }
    if (config.name) useProjectsState.getState().adoptProjectName(project.id, config.name);
}

/**
 * Point the app at `projectId`: reopen its databases, load its folder, replay its sources.
 *
 *   1. Re-attach the project catalog (`dash`, `<id>.dash.duckdb`) and the cache catalog against the new
 *      project's files (WASM registers the OPFS handles first) and make `dash` the default catalog, so
 *      unqualified `CREATE TABLE` lands in the project file.
 *   2. Load the project's folder into the workspace store, then replay its `sources.sql` (ATTACH / CREATE VIEW /
 *      secrets) so its data is back before the queries are registered.
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
    const projectPath = root + getProjectFileName(projectId);
    const cachePath = root + getProjectCacheFileName(projectId);

    console.log(`Loading project ${projectId} from ${project.folder || 'the working directory'} (databases: ${projectPath}, ${cachePath})`);

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

    useInitState.getState().setStep('loading-project-relations');
    await useWorkspace.getState().load(projectHost().backend(project));
    await syncProjectConfig(project);

    // Replay the project's data sources before registering the queries that may read them.
    useInitState.getState().setStep('loading-project-connections');
    await initProjectSources();

    useInitState.getState().setStep('loading-project-macros');
    await registerQueryMacros(useWorkspace.getState().files);
    stopFollowing = [followQueryMacros(), ContentLifecycle.followRemovedFiles()];

    useInitState.getState().setStep('loading-project-cached-results');
    await ContentLifecycle.onProjectLoad(useWorkspace.getState().files);
    await useRelationDataState.getState().loadLastUsed();
}

/**
 * Re-point the app at a different project: close the old one, then load the new one.
 *
 * Switches are serialized (see {@link loadOrSwitchProject}) so overlapping calls — e.g. rapid project
 * navigation — can't interleave the destroy/reopen of the WASM database.
 */
async function runLoadOrSwitchProject(projectId: string): Promise<void> {
    if (useProjectsState.getState().currentProjectId === projectId) return;

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
        toast.error(`Couldn't open the project: ${e instanceof Error ? e.message : String(e)}`);
    }
    useInitState.getState().setStep('complete');
}

// Serialize switches: chain each call after the previous one (regardless of success/failure) so two
// switches can't interleave the WASM destroy/reopen. Callers fire-and-forget via `void switchProject`.
let pendingSwitch: Promise<void> = Promise.resolve();

export function loadOrSwitchProject(projectId: string): Promise<void> {
    pendingSwitch = pendingSwitch.then(
        () => runLoadOrSwitchProject(projectId),
        () => runLoadOrSwitchProject(projectId),
    );
    return pendingSwitch;
}
