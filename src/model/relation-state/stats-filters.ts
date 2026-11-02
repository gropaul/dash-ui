import {Column} from "@/model/data-source-connection";

/**
 * Filters picked in a query's column stats (the Columns tab): a range from a histogram, values from the top values.
 * They sit on top of the query, not in its SQL: every view reads `SELECT * FROM (query) WHERE <filters>`, while the
 * stats read the query itself, so they show the whole data with the pick marked on it. Kept in memory only.
 */

/** A range of a histogram, on its scale: the number, or a date's epoch milliseconds. */
export type ColumnFilterRange = {
    type: 'range';
    min: number;
    max: number;
};

/** Some of a column's values; null matches NULL. */
export type ColumnFilterValues = {
    type: 'values';
    values: unknown[];
};

export type ColumnFilter = ColumnFilterRange | ColumnFilterValues;

/** By column name. */
export type StatsFilters = Record<string, ColumnFilter>;

/** `filters` with `column` set to `filter`, or without it when undefined. */
export function setColumnFilter(filters: StatsFilters | undefined, column: string, filter: ColumnFilter | undefined): StatsFilters {
    const next = {...filters};
    if (filter) next[column] = filter;
    else delete next[column];
    return next;
}

function quoteIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
}

function literal(value: unknown): string {
    if (typeof value === 'number' || typeof value === 'bigint') return String(value);
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return `'${String(value).replace(/'/g, "''")}'`;
}

function condition(column: Column, filter: ColumnFilter): string | undefined {
    const ref = quoteIdentifier(column.name);
    if (filter.type === 'range') {
        // The histogram of a date counts its epoch milliseconds (model/column-stats.ts).
        const value = column.type === 'Timestamp' ? `epoch_ms(${ref})` : ref;
        return `${value} BETWEEN ${filter.min} AND ${filter.max}`;
    }
    const values = filter.values.filter(v => v !== null && v !== undefined);
    const parts = values.length > 0 ? [`${ref} IN (${values.map(literal).join(', ')})`] : [];
    if (values.length < filter.values.length) parts.push(`${ref} IS NULL`);
    if (parts.length === 0) return undefined;
    return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
}

/**
 * `source` (a subquery with `alias`, as the views read it) narrowed to `filters`. Filters on columns `columns` doesn't
 * have are left out, so a query that dropped a column still runs.
 */
export function withStatsFilters(source: string, alias: string, filters: StatsFilters | undefined, columns: Column[]): string {
    if (!filters) return source;
    const byName = new Map(columns.map(c => [c.name, c]));
    const conditions = Object.entries(filters)
        .map(([name, filter]) => byName.has(name) ? condition(byName.get(name)!, filter) : undefined)
        .filter((c): c is string => c !== undefined);
    if (conditions.length === 0) return source;
    return `(SELECT * FROM ${source} WHERE ${conditions.join(' AND ')}) AS ${alias}`;
}
