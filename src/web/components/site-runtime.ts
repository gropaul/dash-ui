import {useEffect} from "react";
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
 * The website runs a canvas and a page without the app around them: no project, their files only in memory, and
 * DuckDB WASM started late. What they showed when the snapshot was taken (src/web/snapshot.mjs) shows at once;
 * a query waits until DuckDB is up, and DuckDB starts only when the page asks for it (startDatabase), so the
 * queries run on mount don't pull its download in before the page has loaded.
 */

export interface SiteSnapshot {
    relations: Record<string, RelationState>;
    data: Record<string, RelationData>;
}

const connection = specToConnection(getDefaultSpec('duckdb-wasm'));
let database: Promise<DatabaseConnection> | undefined;
let ready = false;
let connected = false;
let allowStart: () => void;
const allowed = new Promise<void>(resolve => allowStart = resolve);
// Run once DuckDB is up, before any query: e.g. views the queries read.
let siteSetup: string[] = [];

/** Whether a query is waiting for DuckDB to start. */
export const useWaitingForDatabase = create<boolean>(() => false);

// `?fresh` (e2e builds only) runs every query instead of showing the snapshot, so a new one can be taken.
const fresh = () => process.env.NEXT_PUBLIC_E2E === '1' && new URLSearchParams(window.location.search).has('fresh');

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
            ...siteSetup,
        ];
        for (const sql of setup) await connection.executeQuery(sql, false, false);
        ready = true;
        useWaitingForDatabase.setState(false, true);
        return connection;
    })();
    return database;
}

/** Starts DuckDB once the page is idle. */
export function useStartDatabaseWhenIdle() {
    useEffect(() => {
        const idle = requestIdleCallback(() => void startDatabase(), {timeout: 4000});
        return () => cancelIdleCallback(idle);
    }, []);
}

/** Sets up the connection the site's queries wait on, which runs `setup` first; once. */
function connect(setup: string[]) {
    if (connected) return;
    connected = true;
    siteSetup = setup;
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
    if (process.env.NEXT_PUBLIC_E2E === '1') {
        (window as unknown as { __dashSiteSnapshot?: () => SiteSnapshot }).__dashSiteSnapshot = takeSnapshot;
    }
}

/**
 * Adds the file at `path` to the workspace, with what `snapshot` holds for its queries, and sets up the connection
 * they wait on, which runs `setup` first.
 */
export function openSiteFile(path: string, text: string, setup: string[], snapshot: SiteSnapshot) {
    connect(setup);
    useWorkspace.setState(state => ({files: {...state.files, [path]: text}, dirs: new Set()}));
    if (fresh()) return;
    const prefix = `${path}#`;
    const own = <T, >(entries: Record<string, T>) =>
        Object.fromEntries(Object.entries(entries).filter(([id]) => id.startsWith(prefix)));
    // Shown as run just now, not when the snapshot was taken.
    const now = Date.now();
    const relations = Object.fromEntries(Object.entries(own(snapshot.relations)).map(([id, relation]) => [id, {
        ...relation,
        lastExecutionMetaData: relation.lastExecutionMetaData && {...relation.lastExecutionMetaData, lastExecutedAt: now},
    }]));
    useSurfaces.setState(state => ({relations: {...state.relations, ...relations}}));
    useRelationDataState.setState(state => ({data: {...state.data, ...own(snapshot.data)}}));
}

/** What the site's queries show now, to save as its snapshot. */
function takeSnapshot(): SiteSnapshot {
    return {relations: useSurfaces.getState().relations, data: useRelationDataState.getState().data};
}
