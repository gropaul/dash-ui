export interface DatabaseFunction {
    name: string;
    type: string;
}

export interface DatabaseKeyword {
    name: string;
    type: 'type_function' | 'reserved';
}

export interface Column {
    name: string;
    /** Normalized name: unquoted + lowercase. Used for sorting and binary search. */
    escapedName: string;
    type: string;
}

export interface Table {
    name: string;
    /** Normalized name: unquoted + lowercase. Used for sorting and binary search. */
    escapedName: string;
    type: 'ordinary' | 'dash_node';
    children: Column[];
    /** Human-readable display name (dash_node only). */
    displayName?: string;
    /** Source SQL query (dash_node only). */
    query?: string;
}

export interface Database {
    name: string;
    /** Normalized name: unquoted + lowercase. Used for sorting and binary search. */
    escapedName: string;
    type: string;
    children: Table[];
}

/**
 * Normalize an SQL identifier for case-insensitive lookup and sorting.
 * Strips surrounding double-quotes and lowercases: `"MyTable"` → `mytable`. also remove macro() -> macro
 */
export function normalizeIdentifier(name: string): string {
    return name.replace(/\(\)$/, '').replace(/^"|"$/g, '').toLowerCase();
}

/**
 * Binary search on any sorted array that has an `escapedName` field.
 * The target is normalized via `normalizeIdentifier` before comparison.
 * Returns the index of the match, or -1 if not found.
 */
export function binarySearchByName<T extends { escapedName: string }>(arr: T[], target: string): number {
    const normalized = normalizeIdentifier(target);
    let lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const cmp = arr[mid].escapedName.localeCompare(normalized);
        if (cmp === 0) return mid;
        else if (cmp < 0) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
