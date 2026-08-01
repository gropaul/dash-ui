import {DatabaseConnection} from "@/model/database-connection";
import {splitSQL} from "@/platform/sql-utils";
import {useProjectsState} from "@/state/projects.state";
import {SourceReplayResult, useSourcesHealthState} from "@/state/sources/sources-health.state";
import {SourceSession} from "@/state/sources/source-session";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useDataSourcesState} from "@/state/data-sources.state";

/**
 * Replay the current project's data-sources manifest (`project.sourcesSql`) against the connection:
 * execute each statement (ATTACH / CREATE VIEW / secrets …) so the project's data is reconstituted on
 * open. Runs once per project open/switch, right after the dash catalog is attached and before data
 * sources are enumerated, so re-attached databases show up in the catalog.
 *
 * Each statement runs independently; a failure (e.g. a moved/missing file) is recorded rather than
 * aborting the rest, and surfaces in the Data sources list as an unhealthy source.
 *
 * A replay first undoes the previous one, so it reconciles rather than appends: dropping an ATTACH
 * from the manifest and re-attaching actually detaches it.
 */
export async function initProjectSources(): Promise<void> {
    const connection = ConnectionsService.getInstance().getDatabaseConnection();
    // no-op on a project switch, where teardownProjectSources() has already run
    await undoRecordedEffects(connection);

    const sql = useProjectsState.getState().getCurrentProject()?.sourcesSql ?? "";
    if (!sql.trim()) {
        useSourcesHealthState.getState().clear();
        await useDataSourcesState.getState().refreshAllConnections();
        return;
    }

    const statements = splitSQL(sql).map((s) => s.trim()).filter(Boolean);
    const results: SourceReplayResult[] = [];
    for (const statement of statements) {
        // recorded whether or not it runs: a statement can fail precisely because its object is
        // already there (a non-idempotent ATTACH replayed against a session that outlived the page,
        // as the native one does), and that is state this project owns and has to clean up. Undo is
        // IF EXISTS throughout, so recording something that never got created is a no-op.
        SourceSession.instance().record(statement);
        try {
            await connection.executeQuery(statement, false);
            results.push({statement, ok: true, error: null});
        } catch (e) {
            results.push({statement, ok: false, error: e instanceof Error ? e.message : String(e)});
        }
    }
    useSourcesHealthState.getState().setResults(results);

    // the catalog tree is derived from the live connection, so it has to be re-read once the
    // attachments changed - otherwise it keeps showing the previous project's databases
    await useDataSourcesState.getState().refreshAllConnections();
}

/**
 * Remove the open project's data sources again, so the next project doesn't inherit them. Called on
 * project switch, before the new project's databases are attached.
 *
 * The inverse of the replay, not a sweep of the catalog: we only remove what we recorded ourselves.
 * That keeps every backend on the same path, including a duckdb-over-http server that may be shared
 * with other sessions and hold databases nobody attached through dash.
 */
export async function teardownProjectSources(): Promise<void> {
    const connection = ConnectionsService.getInstance().getDatabaseConnection();
    await undoRecordedEffects(connection);
    useSourcesHealthState.getState().clear();
}

/** Run the ledger's undo statements, best-effort: a failing DETACH must not stop the rest. */
async function undoRecordedEffects(connection: DatabaseConnection): Promise<void> {
    const session = SourceSession.instance();
    for (const statement of session.undoStatements()) {
        try {
            await connection.executeQuery(statement, false, false);
        } catch (e) {
            console.warn("Failed to remove a project data source:", statement, e);
        }
    }
    session.clear();
}
