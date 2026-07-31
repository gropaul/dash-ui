import {DatabaseConnection} from "@/model/database-connection";
import {splitSQL} from "@/platform/sql-utils";
import {useProjectsState} from "@/state/projects.state";
import {SourceReplayResult, useSourcesHealthState} from "@/state/sources/sources-health.state";
import {ConnectionsService} from "@/state/connections/connections-service";

/**
 * Replay the current project's data-sources manifest (`project.sourcesSql`) against the connection:
 * execute each statement (ATTACH / CREATE VIEW / secrets …) so the project's data is reconstituted on
 * open. Runs once per project open/switch, right after the dash catalog is attached and before data
 * sources are enumerated, so re-attached databases show up in the catalog.
 *
 * Each statement runs independently; a failure (e.g. a moved/missing file) is recorded rather than
 * aborting the rest, and surfaces in the Data sources list as an unhealthy source.
 */
export async function initProjectSources(): Promise<void> {
    const connection = ConnectionsService.getInstance().getDatabaseConnection();
    const sql = useProjectsState.getState().getCurrentProject()?.sourcesSql ?? "";
    if (!sql.trim()) {
        useSourcesHealthState.getState().clear();
        return;
    }

    const statements = splitSQL(sql).map((s) => s.trim()).filter(Boolean);
    const results: SourceReplayResult[] = [];
    for (const statement of statements) {
        try {
            await connection.executeQuery(statement, false);
            results.push({statement, ok: true, error: null});
        } catch (e) {
            results.push({statement, ok: false, error: e instanceof Error ? e.message : String(e)});
        }
    }
    useSourcesHealthState.getState().setResults(results);
}
