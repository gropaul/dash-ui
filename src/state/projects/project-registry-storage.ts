import {ConnectionsService} from "@/state/connections/connections-service";
import {DASH_CATALOG_PROJECTS, DASH_PROJECTS_TABLE_NAME} from "@/platform/global-data";
import {Project, ProjectIconKey} from "@/model/project";

/**
 * Persistence for the projects registry — the list of projects, stored as a plain relational
 * table (one row per project) in the GLOBAL (per-connection) meta database (`projects.duckdb`).
 * The registry lives with the connection's data: a WASM instance's OPFS and an HTTP server each
 * keep their own independent set of projects — and being a real table, the server side can
 * `SELECT` it directly.
 *
 * It's a small, low-frequency store, so it skips the throttle/version-conflict machinery of the
 * relation-state StorageDuckAPI. Saves are whole-registry snapshots (the store subscription hands
 * us the full list), so a save is a single atomic `CREATE OR REPLACE TABLE` — deletes come for
 * free, and there's no cross-statement transaction to coordinate (executeQuery splits statements,
 * and over HTTP each one is its own request, so multi-statement transactions can't be relied on).
 * No PRIMARY KEY: ids are unique by construction (the store is keyed by id) and the table is
 * always rewritten whole.
 */

const PROJECTS_TABLE = `"${DASH_CATALOG_PROJECTS}"."main"."${DASH_PROJECTS_TABLE_NAME}"`;

const PROJECTS_SCHEMA = `(
    id          VARCHAR,
    name        VARCHAR,
    icon        VARCHAR,
    root_path   VARCHAR,
    created_at  BIGINT,
    opened_at   BIGINT,
    sources_sql VARCHAR
)`;

/** Make sure the table exists so the first-run read doesn't fail. */
async function ensureTable(): Promise<void> {
    const con = ConnectionsService.getInstance().getDatabaseConnection();
    await con.executeQuery(`CREATE TABLE IF NOT EXISTS ${PROJECTS_TABLE} ${PROJECTS_SCHEMA};`, false);
}

/** A SQL string literal (single-quote escaped). */
function lit(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

/**
 * The outcome of reading the registry. `empty` (no rows yet, a genuine first run) is safe to
 * seed over.
 */
export type ProjectsRegistryLoad =
    | {status: 'ok'; projects: Record<string, Project>}
    | {status: 'empty'};

/** Read the projects registry from the meta database. */
export async function loadProjectsRegistry(): Promise<ProjectsRegistryLoad> {
    await ensureTable();
    const con = ConnectionsService.getInstance().getDatabaseConnection();
    const res = await con.executeQuery(
        `SELECT id, name, icon, root_path, created_at, opened_at, sources_sql FROM ${PROJECTS_TABLE};`,
        false,
    );
    if (res.rows.length === 0) return {status: 'empty'};

    const projects: Record<string, Project> = {};
    for (const [id, name, icon, rootPath, createdAt, openedAt, sourcesSql] of res.rows) {
        projects[String(id)] = {
            id: String(id),
            name: String(name),
            icon: String(icon) as ProjectIconKey,
            rootPath: String(rootPath),
            // WASM hands BIGINTs back as bigint, HTTP as JSON numbers — normalize.
            createdAt: Number(createdAt),
            openedAt: Number(openedAt),
            sourcesSql: String(sourcesSql),
        };
    }
    return {status: 'ok', projects};
}

/** Rewrite the projects registry in the meta database (one atomic table replace). */
export async function saveProjectsRegistry(projects: Record<string, Project>): Promise<void> {
    const con = ConnectionsService.getInstance().getDatabaseConnection();
    const rows = Object.values(projects).map((p) =>
        `(${lit(p.id)}, ${lit(p.name)}, ${lit(p.icon)}, ${lit(p.rootPath)}, ${p.createdAt}, ${p.openedAt}, ${lit(p.sourcesSql)})`,
    );

    // An empty registry replaces with the bare schema; VALUES needs at least one row. The casts
    // pin the CTAS column types to the schema above (VALUES would otherwise infer them).
    const sql = rows.length === 0
        ? `CREATE OR REPLACE TABLE ${PROJECTS_TABLE} ${PROJECTS_SCHEMA};`
        : `CREATE OR REPLACE TABLE ${PROJECTS_TABLE} AS
           SELECT id::VARCHAR AS id, name::VARCHAR AS name, icon::VARCHAR AS icon,
                  root_path::VARCHAR AS root_path, created_at::BIGINT AS created_at,
                  opened_at::BIGINT AS opened_at, sources_sql::VARCHAR AS sources_sql
           FROM (VALUES ${rows.join(", ")}) AS t(id, name, icon, root_path, created_at, opened_at, sources_sql);`;
    await con.executeQuery(sql, false);

    // Flush to the file (WASM otherwise leaves the write in the WAL). The write is still durable if
    // this fails — the WAL file is persisted too — so log instead of throwing.
    try {
        await con.executeQuery(`CHECKPOINT "${DASH_CATALOG_PROJECTS}";`, false);
    } catch (e) {
        console.warn('Projects registry checkpoint failed (write remains in the WAL):', e);
    }
}
