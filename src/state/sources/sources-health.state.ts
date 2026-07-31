import {create} from "zustand";

/**
 * Runtime health of the current project's data sources: the per-statement outcome of the last
 * `sources.sql` replay. Derived, not persisted — recomputed on every project open/switch (and on
 * an explicit re-attach). The Data sources list reconciles this against the live catalog.
 */

export interface SourceReplayResult {
    /** The exact statement that was replayed. */
    statement: string;
    /** Whether it executed without error. */
    ok: boolean;
    /** The DuckDB error message when it failed (e.g. file missing / catalog error). */
    error: string | null;
}

interface SourcesHealthZustand {
    results: SourceReplayResult[];
    setResults: (results: SourceReplayResult[]) => void;
    clear: () => void;
}

export const useSourcesHealthState = create<SourcesHealthZustand>((set) => ({
    results: [],
    setResults: (results) => set({results}),
    clear: () => set({results: []}),
}));
