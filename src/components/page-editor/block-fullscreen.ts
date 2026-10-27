import {create} from "zustand";

/** The block open in the fullscreen dialog, by its node id. */
export const useBlockFullscreen = create<{ blockId: string | null, open: (blockId: string | null) => void }>((set) => ({
    blockId: null,
    open: (blockId) => set({blockId}),
}));
