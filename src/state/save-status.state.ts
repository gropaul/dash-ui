import {create} from "zustand";

/**
 * Whether the workspace's changes have reached its folder (see workspace.state.ts). Drives the app-bar save
 * indicator so the user knows whether it's safe to close or reload.
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

// E2E-only, like __workspaceStore: lets a test wait until the changes are saved.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_E2E === '1') {
    (window as unknown as { __saveStatus?: typeof useSaveStatus }).__saveStatus = useSaveStatus;
}
