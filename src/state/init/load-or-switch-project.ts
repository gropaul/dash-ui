import type {PersistStorage} from "zustand/middleware";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {setDatabaseConnection} from "@/state/init/initialize-connections";
import {loadRelationStateFromConnections} from "@/state/persistency/api";
import {StorageDuckAPI} from "@/state/persistency/duckdb-storage";
import {getInitialRelationDataZustandState, useCacheStore, useRelationDataState} from "@/state/relations-data.state";
import {INIT, RelationZustandCombined, useRelationsState} from "@/state/relations.state";
import {useInitState} from "@/state/init.state";
import {DatabaseConnection} from "@/model/database-connection";
import {initProjectSources} from "@/state/sources/replay-sources";
import {getProjectDashStateFileName, getProjectDataFileName, useProjectsState} from "@/state/projects.state";
import {DASH_CACHE_SCHEMA, DASH_CATALOG_DATA, DASH_CATALOG_STATE, DASH_REFS_SCHEMA} from "@/platform/global-data";
import {reregisterMacrosFromRelationState} from "@/state/relations/sql/table-macros";

// A persist storage that drops every write. We swap the relation store onto this while clearing the
// outgoing project's in-memory state, so `setState(INIT)` cannot write an empty blob into either
// project's dash file. loadRelationStateFromConnections() swaps the real storage back before rehydrate.
const DISCARD_STORAGE: PersistStorage<RelationZustandCombined> = {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
};

/**
 * Tear down the outgoing project's in-memory state so the incoming project starts clean.
 *
 * Shows the init loading splash (a non-'complete' step) and clears the in-memory relation state +
 * data. The clear must be explicit — rehydrate MERGES persisted-over-current, so if the target
 * project's stored state is empty (a fresh project) it would leave the OUTGOING project's relations
 * in memory. We detach persistence first (DISCARD_STORAGE) so clearing doesn't write the empty state
 * into the outgoing file, and cancel any pending throttled write so nothing clobbers the new file.
 */
function closeOldProject(): void {
    useInitState.getState().setStep('closing-current-project');
    useRelationsState.persist.setOptions({storage: DISCARD_STORAGE});
    useRelationsState.setState(INIT);
    useRelationDataState.setState(getInitialRelationDataZustandState());
    useCacheStore.getState().clear();
    StorageDuckAPI.resetForProjectSwitch();
}

/**
 * Point the app at `projectId`, reopen its databases against its files, replay its sources, and
 * rehydrate its workspace.
 *
 *   1. Repoint the storage seam and re-attach the data + state catalogs against the new project's
 *      files (WASM registers the OPFS handles; HTTP reconciles the state DB via initDashCatalog).
 *   2. Replay the project's `sources.sql` (ATTACH / CREATE VIEW / secrets) so its data is back before
 *      relations run.
 *   3. Rehydrate relation state + last-used from the new project's dash file. The rehydrate pipeline
 *      (onRelationStateLoadedFromConnection) drives the init step back to 'complete', hiding the splash.
 *
 */
async function loadProject(projectId: string, connection: DatabaseConnection): Promise<void> {

    useProjectsState.getState().setCurrentProject(projectId);

    // create a temporary database in memory that we can use for detaching the others
    await connection.executeQuery(`ATTACH IF NOT EXISTS ':memory:' as dash_temp;`, false, false);
    await connection.executeQuery(`USE dash_temp;`, false, false);

    // now we can safely detach
    await connection.executeQuery(`DETACH DATABASE IF EXISTS ${DASH_CATALOG_DATA};`, false, false);
    await connection.executeQuery(`DETACH DATABASE IF EXISTS ${DASH_CATALOG_STATE};`, false, false);

    const base_path = await connection.getStorageRoot();
    const data_path = base_path + getProjectDataFileName(projectId);
    const state_path = base_path + getProjectDashStateFileName(projectId);

    console.log(`Loading project ${projectId} from ${data_path} and ${state_path}`);

    if (connection.type === 'duckdb-wasm') {
        const wasm = DuckdbWasmProvider.getInstance();
        await wasm.attachDatabase(data_path, DASH_CATALOG_DATA);
        await wasm.attachDatabase(state_path, DASH_CATALOG_STATE);
    } else {
        await connection.executeQuery(`ATTACH IF NOT EXISTS '${data_path}' AS ${DASH_CATALOG_DATA};`, false, false);
        await connection.executeQuery(`ATTACH IF NOT EXISTS '${state_path}' AS ${DASH_CATALOG_STATE};`, false, false);
    }

    await connection.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${DASH_CATALOG_STATE}.${DASH_CACHE_SCHEMA};`, false);
    await connection.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${DASH_CATALOG_STATE}.${DASH_REFS_SCHEMA};`, false);

    // use the data connection as the default table so we can store data into it
    await connection.executeQuery(`USE ${DASH_CATALOG_DATA};`, false, false);

    // Replay the project's data sources before rehydrating relations that may reference them.
    useInitState.getState().setStep('loading-project-connections');
    await initProjectSources();

    useInitState.getState().setStep('loading-project-relations');
    await loadRelationStateFromConnections(connection);

    useInitState.getState().setStep('loading-project-macros');
    await reregisterMacrosFromRelationState();

    useInitState.getState().setStep('loading-project-cached-results');
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

export function loadOrSwitchProject(projectId: string): Promise<void> {
    pendingSwitch = pendingSwitch.then(
        () => runLoadOrSwitchProject(projectId),
        () => runLoadOrSwitchProject(projectId),
    );
    return pendingSwitch;
}
