import {isContiguousRange, SelectionState} from "@/model/relation-view-state/selection";
import {removeSemicolon} from "@/platform/sql-utils";

/**
 * Wraps a base query with ROW_NUMBER filtering to return only selected rows.
 * Returns the plain baseQuery when no selection exists.
 */
export function buildSelectionFilteredQuery(
    baseQuery: string,
    selection?: SelectionState
): string {
    if (!selection || selection.selectedIndices.length === 0) {
        return baseQuery;
    }

    const cleanQuery = removeSemicolon(baseQuery);
    const range = isContiguousRange(selection.selectedIndices);

    const filterClause = range
        ? `__row_idx BETWEEN ${range.start} AND ${range.end}`
        : `__row_idx IN (${selection.selectedIndices.join(', ')})`;

    return `SELECT * EXCLUDE (__row_idx) FROM (SELECT *, ROW_NUMBER() OVER () - 1 AS __row_idx FROM (${cleanQuery})) WHERE ${filterClause}`;
}
