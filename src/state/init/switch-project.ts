import type {PersistStorage} from "zustand/middleware";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {setDatabaseConnection} from "@/state/init/initialize-connections";
import {loadRelationStateFromConnections} from "@/state/persistency/api";
import {StorageDuckAPI} from "@/state/persistency/duckdb-storage";
import {getCurrentProjectStorageId, setCurrentProjectStorage} from "@/state/projects/project-storage";
import {getInitialRelationDataZustandState, useCacheStore, useRelationDataState} from "@/state/relations-data.state";
import {INIT, RelationZustandCombined, useRelationsState} from "@/state/relations.state";
import {useInitState} from "@/state/init.state";

// A persist storage that drops every write. We swap the relation store onto this while clearing the
// outgoing project's in-memory state, so `setState(INIT)` cannot write an empty blob into either
// project's dash file. loadRelationStateFromConnections() swaps the real storage back before rehydrate.
const DISCARD_STORAGE: PersistStorage<RelationZustandCombined> = {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
};

/**
 * Re-point the app at a different project's DuckDB files and reload its workspace.
 *
 * Mirrors the initial boot pipeline (initialize-connections → loadRelationStateFromConnections) but
 * for a live switch:
 *   1. Show the init loading splash (set a non-'complete' step) and clear the in-memory relation
 *      state + data. The clear must be explicit — rehydrate MERGES persisted-over-current, so if the
 *      target project's stored state is empty (a fresh project) it would leave the OUTGOING project's
 *      relations in memory. We detach persistence first (DISCARD_STORAGE) so clearing doesn't write
 *      the empty state into the outgoing file.
 *   2. Point the storage seam at the new project and reopen the database against its files.
 *   3. Rehydrate relation state + last-used from the new project's dash file. The rehydrate pipeline
 *      (onRelationStateLoadedFromConnection) drives the init step back to 'complete', hiding the splash.
 *
 * Only meaningful for OPFS/WASM. In duckdb-over-http mode the server owns the file layout, so a switch
 * there just clears + rehydrates against the same connection (per-project server files are future work).
 *
 * Switches are serialized (see {@link switchProject}) so overlapping calls — e.g. rapid project
 * navigation — can't interleave the destroy/reopen of the WASM database.
 */
async function runSwitchProject(projectId: string): Promise<void> {
    if (getCurrentProjectStorageId() === projectId) return;
    if (!ConnectionsService.getInstance().hasDatabaseConnection()) {
        console.error("Can't switch project: no database connection available:", projectId);
        return;
    }

    const connection = ConnectionsService.getInstance().getDatabaseConnection();

    // 1. Show the loading splash + clear in-memory state without persisting the empty state.
    useInitState.getState().setStep('switching-project');
    useRelationsState.persist.setOptions({storage: DISCARD_STORAGE});
    useRelationsState.setState(INIT);
    useRelationDataState.setState(getInitialRelationDataZustandState());
    useCacheStore.getState().clear();

    try {
        // 2. Repoint storage + re-attach the database catalogs against the new project's files. Cancel
        //    any pending throttled write + reset the version cache so nothing clobbers the new file.
        StorageDuckAPI.resetForProjectSwitch();
        setCurrentProjectStorage(projectId);

        if (connection.type === 'duckdb-wasm' || connection.type === 'duckdb-wasm-motherduck') {
            // WASM: swap the data + state catalogs against the new files (the provider must register
            // the OPFS file handles). For HTTP there's nothing to do here — the state DB is reconciled
            // by initDashCatalog below, and data is the shared server connection.
            await DuckdbWasmProvider.getInstance().reattachProjectDatabases();
        }
        // Reconcile the state DB to the new project (real work for HTTP; no-op for WASM) + recreate the
        // dash schemas + refresh data sources.
        await setDatabaseConnection(connection);

        // 3. Restore real storage + rehydrate relation state (→ onRelationStateLoadedFromConnection →
        //    loadLastUsed → step 'complete') from the new project's dash file.
        loadRelationStateFromConnections(connection);
    } catch (e) {
        // Never leave the app stuck on the loading splash if the swap fails.
        console.error("Failed to switch project:", projectId, e);
        useInitState.getState().setStep('complete');
    }
}

// Serialize switches: chain each call after the previous one (regardless of success/failure) so two
// switches can't interleave the WASM destroy/reopen. Callers fire-and-forget via `void switchProject`.
let pendingSwitch: Promise<void> = Promise.resolve();

export function switchProject(projectId: string): Promise<void> {
    pendingSwitch = pendingSwitch.then(
        () => runSwitchProject(projectId),
        () => runSwitchProject(projectId),
    );
    return pendingSwitch;
}
