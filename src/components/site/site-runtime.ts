import {DatabaseConnection} from "@/model/database-connection";
import {RelationState} from "@/model/relation-state";
import {RelationData} from "@/model/relation";
import {ConnectionsService} from "@/state/connections/connections-service";
import {getDefaultSpec, specToConnection} from "@/state/connections/configs";
import {useRelationDataState} from "@/state/relations-data.state";
import {useSurfaces} from "@/state/workspace/surfaces.state";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {DASH_CATALOG_CACHE, DASH_CATALOG_STATE, DASH_INTERNAL_SCHEMAS} from "@/platform/global-data";

/**
 * The website runs a canvas without the app around it: no project, its file only in memory, and DuckDB WASM
 * started late. What the canvas showed when its snapshot was taken (scripts/site-snapshot.mjs) shows at once;
 * a query waits until DuckDB is up.
 */

export interface CanvasSnapshot {
    relations: Record<string, RelationState>;
    data: Record<string, RelationData>;
}

const connection = specToConnection(getDefaultSpec('duckdb-wasm'));
let database: Promise<DatabaseConnection> | undefined;

/** Starts DuckDB WASM with in-memory catalogs in place of a project's; once, however often it is called. */
export function startDatabase(): Promise<DatabaseConnection> {
    database ??= (async () => {
        await connection.initialise();
        const setup = [
            `ATTACH IF NOT EXISTS ':memory:' AS ${DASH_CATALOG_STATE};`,
            `ATTACH IF NOT EXISTS ':memory:' AS ${DASH_CATALOG_CACHE};`,
            ...DASH_INTERNAL_SCHEMAS.map(schema => `CREATE SCHEMA IF NOT EXISTS ${DASH_CATALOG_STATE}.${schema};`),
            `USE ${DASH_CATALOG_STATE};`,
        ];
        for (const sql of setup) await connection.executeQuery(sql, false, false);
        return connection;
    })();
    return database;
}

/** Makes the canvas file at `path` the workspace and sets up the connection its queries wait on. */
export function openSiteCanvas(path: string, text: string, snapshot?: CanvasSnapshot) {
    const waiting = new Proxy(connection, {
        get(target, property, receiver) {
            if (property !== 'executeQuery') return Reflect.get(target, property, receiver);
            return async (...args: Parameters<DatabaseConnection['executeQuery']>) => (await startDatabase()).executeQuery(...args);
        },
    });
    void ConnectionsService.getInstance().setDatabaseConnection(waiting);

    useWorkspace.setState({files: {[path]: text}, dirs: new Set()});
    if (!snapshot) return;
    // Shown as run just now, not when the snapshot was taken.
    const now = Date.now();
    const relations = Object.fromEntries(Object.entries(snapshot.relations).map(([id, relation]) => [id, {
        ...relation,
        lastExecutionMetaData: relation.lastExecutionMetaData && {...relation.lastExecutionMetaData, lastExecutedAt: now},
    }]));
    useSurfaces.setState({relations});
    useRelationDataState.setState(state => ({data: {...state.data, ...snapshot.data}}));
}

/** What the canvas at `path` shows now, to save as its snapshot. */
export function takeSnapshot(path: string): CanvasSnapshot {
    const prefix = `${path}#`;
    const pick = <T, >(entries: Record<string, T>) =>
        Object.fromEntries(Object.entries(entries).filter(([id]) => id.startsWith(prefix)));
    return {relations: pick(useSurfaces.getState().relations), data: pick(useRelationDataState.getState().data)};
}
