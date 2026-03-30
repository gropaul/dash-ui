import {createWithEqualityFn} from "zustand/traditional";
import {Edge, Node} from "@xyflow/react";

const MAX_HISTORY_SIZE = 100;

export interface CanvasSnapshot {
    nodes: Node[];
    edges: Edge[];
}

interface CanvasHistoryEntry {
    past: CanvasSnapshot[];
    future: CanvasSnapshot[];
}

interface CanvasHistoryState {
    // Map of canvasId -> history
    histories: Record<string, CanvasHistoryEntry>;

    // Actions
    takeSnapshot: (canvasId: string, nodes: Node[], edges: Edge[]) => void;
    undo: (canvasId: string, currentNodes: Node[], currentEdges: Edge[]) => CanvasSnapshot | null;
    redo: (canvasId: string, currentNodes: Node[], currentEdges: Edge[]) => CanvasSnapshot | null;
    canUndo: (canvasId: string) => boolean;
    canRedo: (canvasId: string) => boolean;
    clearHistory: (canvasId: string) => void;
}

const getOrCreateHistory = (
    histories: Record<string, CanvasHistoryEntry>,
    canvasId: string
): CanvasHistoryEntry => {
    return histories[canvasId] ?? {past: [], future: []};
};

export const useCanvasHistoryState = createWithEqualityFn<CanvasHistoryState>(
    (set, get) => ({
        histories: {},

        takeSnapshot: (canvasId, nodes, edges) => {
            set((state) => {
                const history = getOrCreateHistory(state.histories, canvasId);
                const snapshot: CanvasSnapshot = {
                    nodes: structuredClone(nodes),
                    edges: structuredClone(edges),
                };

                const newPast = [...history.past, snapshot];
                if (newPast.length > MAX_HISTORY_SIZE) {
                    newPast.shift();
                }

                return {
                    histories: {
                        ...state.histories,
                        [canvasId]: {
                            past: newPast,
                            future: [], // Clear redo stack on new action
                        },
                    },
                };
            });
        },

        undo: (canvasId, currentNodes, currentEdges) => {
            const history = getOrCreateHistory(get().histories, canvasId);
            if (history.past.length === 0) return null;

            const newPast = [...history.past];
            const previous = newPast.pop()!;

            const currentSnapshot: CanvasSnapshot = {
                nodes: structuredClone(currentNodes),
                edges: structuredClone(currentEdges),
            };

            set((state) => ({
                histories: {
                    ...state.histories,
                    [canvasId]: {
                        past: newPast,
                        future: [currentSnapshot, ...history.future],
                    },
                },
            }));

            return previous;
        },

        redo: (canvasId, currentNodes, currentEdges) => {
            const history = getOrCreateHistory(get().histories, canvasId);
            if (history.future.length === 0) return null;

            const newFuture = [...history.future];
            const next = newFuture.shift()!;

            const currentSnapshot: CanvasSnapshot = {
                nodes: structuredClone(currentNodes),
                edges: structuredClone(currentEdges),
            };

            set((state) => ({
                histories: {
                    ...state.histories,
                    [canvasId]: {
                        past: [...history.past, currentSnapshot],
                        future: newFuture,
                    },
                },
            }));

            return next;
        },

        canUndo: (canvasId) => {
            const history = get().histories[canvasId];
            return history ? history.past.length > 0 : false;
        },

        canRedo: (canvasId) => {
            const history = get().histories[canvasId];
            return history ? history.future.length > 0 : false;
        },

        clearHistory: (canvasId) => {
            set((state) => ({
                histories: {
                    ...state.histories,
                    [canvasId]: {past: [], future: []},
                },
            }));
        },
    })
);
