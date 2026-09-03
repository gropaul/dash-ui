import path from 'path';
import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {RelationData} from "@/model/relation";
import {DASH_CATALOG_STATE, DASH_META_SCHEMA, DASH_STORAGE_VERSION} from "@/platform/global-data";

// Real DuckDB (blocking duckdb-wasm Node API) so the round trip exercises the SQL, not a fake.
const DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs'));
const duckdb = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs');

let db: any;
let conn: any;

function executeQuery(query: string): Promise<RelationData> {
    const table = conn.query(query);
    const rows = table.toArray().map((row: any) => {
        const obj = row.toJSON();
        return table.schema.fields.map((f: any) => obj[f.name]);
    });
    return Promise.resolve({columns: [], rows});
}

vi.mock('@/state/connections/connections-service', () => ({
    ConnectionsService: {
        getInstance: () => ({
            getDatabaseConnection: () => ({executeQuery: (q: string) => executeQuery(q)}),
        }),
    },
}));

const {loadProjectMeta, saveProjectMeta} = await import('@/state/projects/project-meta-storage');

describe('project meta storage', () => {
    beforeAll(async () => {
        const bundle = {
            mvp: {mainModule: path.join(DUCKDB_DIST, 'duckdb-mvp.wasm'), mainWorker: null},
            eh: null,
        };
        db = await duckdb.createDuckDB(bundle, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
        await db.instantiate();
        conn = db.connect();
        conn.query(`ATTACH ':memory:' AS ${DASH_CATALOG_STATE};`);
        conn.query(`CREATE SCHEMA ${DASH_CATALOG_STATE}.${DASH_META_SCHEMA};`);
    });

    afterAll(() => {
        conn?.close();
    });

    it('reads null from a fresh file', async () => {
        expect(await loadProjectMeta()).toBeNull();
    });

    it('round-trips a meta row, quotes included', async () => {
        const meta = {
            name: "Paul's project",
            icon: 'rocket' as const,
            sourcesSql: "ATTACH 'x.duckdb' AS x;\nCREATE VIEW v AS SELECT 'it''s';",
            createdAt: 1_725_000_000_000,
            layoutVersion: DASH_STORAGE_VERSION,
        };
        await saveProjectMeta(meta);
        expect(await loadProjectMeta()).toEqual(meta);
    });

    it('replaces the single row on save', async () => {
        await saveProjectMeta({name: 'a', icon: 'dash', sourcesSql: '', createdAt: 1, layoutVersion: DASH_STORAGE_VERSION});
        await saveProjectMeta({name: 'b', icon: 'dash', sourcesSql: '', createdAt: 1, layoutVersion: DASH_STORAGE_VERSION});
        expect((await loadProjectMeta())?.name).toBe('b');
    });
});
