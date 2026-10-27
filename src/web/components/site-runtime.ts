import {create} from "zustand";
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
 * started late. What the canvas showed when its snapshot was taken (src/web/snapshot.mjs) shows at once;
 * a query waits until DuckDB is up, and DuckDB starts only when the page asks for it (startDatabase), so the
 * canvas's own queries on mount don't pull its download in before the canvas has loaded.
 */

export interface CanvasSnapshot {
    relations: Record<string, RelationState>;
    data: Record<string, RelationData>;
}

const connection = specToConnection(getDefaultSpec('duckdb-wasm'));
let database: Promise<DatabaseConnection> | undefined;
let ready = false;
let allowStart: () => void;
const allowed = new Promise<void>(resolve => allowStart = resolve);
// Run once DuckDB is up, before any query: e.g. views the canvas reads.
let canvasSetup: string[] = [];

/** Whether a query is waiting for DuckDB to start. */
export const useWaitingForDatabase = create<boolean>(() => false);

/** Starts DuckDB WASM with in-memory catalogs in place of a project's; once, however often it is called. */
export function startDatabase(): Promise<DatabaseConnection> {
    allowStart();
    database ??= (async () => {
        await connection.initialise();
        const setup = [
            `ATTACH IF NOT EXISTS ':memory:' AS ${DASH_CATALOG_STATE};`,
            `ATTACH IF NOT EXISTS ':memory:' AS ${DASH_CATALOG_CACHE};`,
            ...DASH_INTERNAL_SCHEMAS.map(schema => `CREATE SCHEMA IF NOT EXISTS ${DASH_CATALOG_STATE}.${schema};`),
            `USE ${DASH_CATALOG_STATE};`,
            ...canvasSetup,
        ];
        for (const sql of setup) await connection.executeQuery(sql, false, false);
        ready = true;
        useWaitingForDatabase.setState(false, true);
        return connection;
    })();
    return database;
}

/**
 * Makes the canvas file at `path` the workspace and sets up the connection its queries wait on, which runs `setup`
 * first.
 */
export function openSiteCanvas(path: string, text: string, setup: string[], snapshot?: CanvasSnapshot) {
    canvasSetup = setup;
    const waiting = new Proxy(connection, {
        get(target, property, receiver) {
            if (property !== 'executeQuery') return Reflect.get(target, property, receiver);
            return async (...args: Parameters<DatabaseConnection['executeQuery']>) => {
                if (!ready) useWaitingForDatabase.setState(true, true);
                await allowed;
                return (await startDatabase()).executeQuery(...args);
            };
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
