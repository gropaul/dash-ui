import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckdbWasmProvider, getStorageMode} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {removeOpfsFile} from "@/state/connections/duckdb-wasm/utils";
import {getProjectDashStateFileName, getProjectDataFileName} from "@/state/projects.state";

/**
 * Best-effort removal of a deleted project's OPFS artifacts: its data + state databases and their
 * WAL files. WASM/OPFS only — in duckdb-over-http mode the server owns its file layout, and in
 * memory mode there is nothing on disk. Callers must make sure the project's catalogs are no longer
 * attached (when deleting the OPEN project, switch away first) — a still-open handle makes the
 * removal fail, which is logged and left behind rather than escalated.
 */
export async function deleteProjectArtifacts(projectId: string): Promise<void> {
    const service = ConnectionsService.getInstance();
    if (!service.hasDatabaseConnection()) return;
    const type = service.getDatabaseConnection().type;
    if (type !== 'duckdb-wasm' && type !== 'duckdb-wasm-motherduck') return;
    if (getStorageMode() !== 'opfs') return;

    const {db} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
    const files = [getProjectDataFileName(projectId), getProjectDashStateFileName(projectId)];
    for (const file of files.flatMap((f) => [f, `${f}.wal`])) {
        // Drop the DuckDB file registration first so its handle on the OPFS file is released.
        try { await db.dropFile('opfs://' + file); } catch { /* not registered */ }
        try {
            await removeOpfsFile(file);
        } catch (e) {
            // Never-created files are fine; anything else (e.g. still locked) is worth surfacing.
            if ((e as DOMException)?.name !== 'NotFoundError') {
                console.warn('Failed to delete project file:', file, e);
            }
        }
    }
}
