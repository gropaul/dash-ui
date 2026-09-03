import {ConnectionsService} from "@/state/connections/connections-service";
import {DASH_CATALOG_STATE, DASH_META_SCHEMA, DASH_STORAGE_VERSION} from "@/platform/global-data";
import {ProjectIconKey, ProjectMeta} from "@/model/project";
import {formatValueForSql as lit} from "@/platform/sql-utils";

/**
 * The `dash_meta.project` row of the open project's file: what a project knows about itself, so it
 * travels when the file is shared. Single row, rewritten whole on every change, same pattern as the
 * registry. Runs on the raw query path because it must also work while the store is rehydrating.
 */

const META_TABLE = `"${DASH_CATALOG_STATE}"."${DASH_META_SCHEMA}"."project"`;

/** The meta row of the attached project file, or null when the file is fresh. */
export async function loadProjectMeta(): Promise<ProjectMeta | null> {
    const con = ConnectionsService.getInstance().getDatabaseConnection();
    await con.executeQuery(
        `CREATE TABLE IF NOT EXISTS ${META_TABLE} (
            name           VARCHAR,
            icon           VARCHAR,
            sources_sql    VARCHAR,
            created_at     BIGINT,
            layout_version BIGINT
        );`,
        false,
    );
    const res = await con.executeQuery(
        `SELECT name, icon, sources_sql, created_at, layout_version FROM ${META_TABLE};`,
        false,
    );
    if (res.rows.length === 0) return null;
    const [name, icon, sourcesSql, createdAt, layoutVersion] = res.rows[0];
    return {
        name: String(name),
        icon: String(icon) as ProjectIconKey,
        sourcesSql: String(sourcesSql),
        createdAt: Number(createdAt),
        layoutVersion: Number(layoutVersion),
    };
}

export async function saveProjectMeta(meta: ProjectMeta): Promise<void> {
    const con = ConnectionsService.getInstance().getDatabaseConnection();
    await con.executeQuery(
        `CREATE OR REPLACE TABLE ${META_TABLE} AS
         SELECT ${lit(meta.name)}::VARCHAR AS name, ${lit(meta.icon)}::VARCHAR AS icon,
                ${lit(meta.sourcesSql)}::VARCHAR AS sources_sql, ${meta.createdAt}::BIGINT AS created_at,
                ${DASH_STORAGE_VERSION}::BIGINT AS layout_version;`,
        false,
    );
    try {
        await con.executeQuery(`CHECKPOINT "${DASH_CATALOG_STATE}";`, false);
    } catch (e) {
        console.warn('Project meta checkpoint failed (write remains in the WAL):', e);
    }
}
