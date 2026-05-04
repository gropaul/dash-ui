import {SelectSelectionSate} from "@/model/relation-view-state/selection";
import {removeSemicolon} from "@/platform/sql-utils";

function formatValueForSql(v: any): string {
    if (typeof v === 'number' || typeof v === 'bigint') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return `'${String(v).replace(/'/g, "''")}'`;
}

/**
 * Wraps a base query with a WHERE ... IN filter for the selected values.
 * Returns the plain baseQuery when no selection exists.
 */
export function buildSelectionFilteredQuery(
    baseQuery: string,
    selection?: SelectSelectionSate
): string {
    if (!selection || selection.selectedValues.length === 0) {
        return baseQuery;
    }

    const cleanQuery = removeSemicolon(baseQuery);
    const vals = selection.selectedValues.map(formatValueForSql).join(', ');
    return `SELECT * FROM (${cleanQuery}) WHERE "${selection.columnName}" IN (${vals})`;
}
