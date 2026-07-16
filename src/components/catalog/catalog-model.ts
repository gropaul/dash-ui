import {useMemo} from "react";
import {useDataSourcesState} from "@/state/data-sources.state";
import {useRelationsState} from "@/state/relations.state";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {getValueTypeGroup, ValueTypeGroup} from "@/model/value-type";
import {Column} from "@/model/data-source-connection";
import {getBaseQueryFromSource} from "@/model/relation-state";
import {RelationSourceTable} from "@/model/relation";
import {DASH_CATALOG, DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {DATA_ROOT} from "@/state/routing/core-model";
import {formatNumber} from "@/platform/number-utils";
import {isDebugMode} from "@/components/settings/about-content";

/**
 * The catalog is a flat, structural read of what the data-source connections have already
 * loaded — no queries are fired. Each connection exposes a tree
 * (database → schema → table/view → column); we flatten the table/view level into
 * {@link CatalogObject}s. Row counts, stats, PK/FK, tags etc. are intentionally absent —
 * they are not part of the loaded model (see the /data catalog plan).
 */

export type CatalogObjectType = 'relation' | 'view';

export interface CatalogObject {
    /** Stable id: `${connectionId}::${database}.${schema}.${name}`. */
    id: string;
    connectionId: string;
    connectionName: string;
    database: string;
    schema: string;
    name: string;
    objType: CatalogObjectType;
    /** The raw column tree nodes (name + ValueType), reused as-is by shared column UIs. */
    columns: Column[];
    /** DuckDB's estimated row count (base tables only; undefined for views). */
    estimatedRows?: number;
}

export type Scope = 'tables' | 'columns';
export type SortDir = 'asc' | 'desc';
export interface SortState { key: string; dir: SortDir; }

/** A flattened column row shown in the "columns" scope. */
export interface ColumnRow {
    o: CatalogObject;
    col: Column;
}

/** What the detail panel is showing: a table, or a column within it. */
export interface CatalogSelection {
    objId: string;
    colName?: string;
}

/** Case-insensitive substring match; empty query matches everything. */
export const includesQ = (hay: string, q: string) => !q || hay.toLowerCase().includes(q.toLowerCase());

/** Stable sort by a keyed extractor; numbers compare numerically, everything else by locale. */
export function sortRows<T>(rows: T[], sort: SortState, extractors: Record<string, (r: T) => string | number>): T[] {
    const extract = extractors[sort.key] ?? extractors[Object.keys(extractors)[0]];
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const va = extract(a);
        const vb = extract(b);
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
    });
}

/** Path segments used for the location breadcrumb and path filtering. */
export function objectPath(o: CatalogObject): string[] {
    return [o.database, o.schema, o.name];
}

export function objectPathStr(o: CatalogObject): string {
    return objectPath(o).join(" / ");
}

/* --------------------------------- routing --------------------------------- */
// Everything under the catalog is a real URL, so the breadcrumb, back/forward and sharing all
// work. Segment count disambiguates:
//   /data                              → the full list
//   /data/<db>                         → list filtered to a database
//   /data/<db>/<schema>                → list filtered to a schema
//   /data/<db>/<schema>/<table>        → the table's full-screen detail
//   /data/<db>/<schema>/<table>/<col>  → a column's full-screen detail
// The 1–2 segment "filtered list" routes are handled by the view (via {@link dataListRoute});
// only the 3+ segment object routes resolve here (via {@link resolveDataRoute}).

export interface DataRouteTarget {
    object: CatalogObject;
    colName?: string;
}

/** The `/data/...` URL for a path-filtered list. Empty segments → the bare list. */
export function dataListRoute(segments: string[]): string {
    return segments.length ? DATA_ROOT + "/" + segments.map(encodeURIComponent).join("/") : DATA_ROOT;
}

/** The `/data/...` URL for an object, optionally a column within it. */
export function dataRoute(o: CatalogObject, colName?: string): string {
    const segs = colName ? [...objectPath(o), colName] : objectPath(o);
    return DATA_ROOT + "/" + segs.map(encodeURIComponent).join("/");
}

/** Resolve a `/data/...` pathname to an object (+ optional column), or null for the list. */
export function resolveDataRoute(objects: CatalogObject[], pathname: string): DataRouteTarget | null {
    const parts = (pathname || "").split("?")[0].split("#")[0].split("/").filter(Boolean).map(decodeURIComponent);
    if (parts[0] !== "data" || parts.length < 4) return null;
    const [, database, schema, table, colName] = parts;
    const object = objects.find((o) => o.database === database && o.schema === schema && o.name === table);
    if (!object) return null;
    return {object, colName: colName && object.columns.some((c) => c.name === colName) ? colName : undefined};
}

/** The `SELECT * FROM …` a table/view maps to — reuses the same builder relations use. */
export function sqlForObject(o: CatalogObject): string {
    return getBaseQueryFromSource(sourceForObject(o));
}

export function sourceForObject(o: CatalogObject): RelationSourceTable {
    return {type: 'table', database: o.database, schema: o.schema, tableName: o.name};
}

/** Open a catalog object as a relation in the workspace — the one real action beyond browsing. */
export function openObjectAsRelation(o: CatalogObject) {
    useRelationsState.getState().showRelationFromSource(o.connectionId, sourceForObject(o), DEFAULT_RELATION_VIEW_PATH);
}

export function columnGroup(col: Column): ValueTypeGroup {
    return getValueTypeGroup(col.type);
}

/** Compact display of an estimated row count; em-dash when unknown (e.g. views). */
export function formatEstimatedRows(n: number | undefined): string {
    return n === undefined ? "—" : formatNumber(n, 1);
}

/** Exact row count for a tooltip; undefined (no title) when unknown. */
export function exactRowsTitle(n: number | undefined): string | undefined {
    return n === undefined ? undefined : `${n.toLocaleString()} rows (estimated)`;
}

/**
 * Flattens every internal-database connection's loaded tree into catalog objects. Local
 * filesystem connections are skipped (no local-file support yet). Pure derivation — the
 * result is memoised on the connections map.
 */
export function useCatalogObjects(): CatalogObject[] {
    const connections = useDataSourcesState((state) => state.connections);
    return useMemo(() => {
        const debug = isDebugMode();
        const objects: CatalogObject[] = [];
        for (const conn of Object.values(connections)) {
            if (conn.type !== 'duckdb-internal-databases') continue;
            const connName = String(conn.config?.name ?? conn.id);
            const databases = Object.values(conn.dataSources ?? {}) as unknown as TreeNode[];
            for (const db of databases) {
                if (db.type !== 'database') continue;
                // The internal dash cache catalog is only surfaced in debug mode.
                if (db.name === DASH_CATALOG && !debug) continue;
                for (const schema of db.children ?? []) {
                    for (const table of schema.children ?? []) {
                        if (table.type !== 'relation' && table.type !== 'view') continue;
                        const columns = (table.children ?? []) as Column[];
                        objects.push({
                            id: `${conn.id}::${db.name}.${schema.name}.${table.name}`,
                            connectionId: conn.id,
                            connectionName: connName,
                            database: db.name,
                            schema: schema.name,
                            name: table.name,
                            objType: table.type as CatalogObjectType,
                            columns,
                            estimatedRows: (table.payload as { estimatedRows?: number } | undefined)?.estimatedRows,
                        });
                    }
                }
            }
        }
        return objects.sort((a, b) => objectPathStr(a).localeCompare(objectPathStr(b)));
    }, [connections]);
}
