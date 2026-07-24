import {create} from "zustand";

/**
 * Persistence status of the relation state (the store saved via StorageDuckAPI into the project's
 * `_dash_state.duckdb` file). Drives the app-bar save indicator so the user knows whether it's safe
 * to close/reload. Note: this tracks relation-state saves only — not the derived query cache or
 * imported data tables.
 */
export type SaveStatus = 'saved' | 'saving' | 'error';

interface SaveStatusStore {
    status: SaveStatus;
    setStatus: (status: SaveStatus) => void;
}

export const useSaveStatus = create<SaveStatusStore>((set) => ({
    status: 'saved',
    setStatus: (status) => set({status}),
}));
