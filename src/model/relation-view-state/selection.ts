export interface SelectionState {
    selectedIndices: number[]; // 0-based row indices into the base query result
}

/**
 * Check if indices form a contiguous range (for BETWEEN optimization).
 */
export function isContiguousRange(indices: number[]): { start: number; end: number } | null {
    if (indices.length === 0) return null;
    const sorted = [...indices].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) return null;
    }
    return {start: sorted[0], end: sorted[sorted.length - 1]};
}
