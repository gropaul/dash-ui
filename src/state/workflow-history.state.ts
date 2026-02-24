import {createWithEqualityFn} from "zustand/traditional";
import {Edge, Node} from "@xyflow/react";

const MAX_HISTORY_SIZE = 100;

export interface WorkflowSnapshot {
    nodes: Node[];
    edges: Edge[];
}

interface WorkflowHistoryEntry {
    past: WorkflowSnapshot[];
    future: WorkflowSnapshot[];
}

interface WorkflowHistoryState {
    // Map of workflowId -> history
    histories: Record<string, WorkflowHistoryEntry>;

    // Actions
    takeSnapshot: (workflowId: string, nodes: Node[], edges: Edge[]) => void;
    undo: (workflowId: string, currentNodes: Node[], currentEdges: Edge[]) => WorkflowSnapshot | null;
    redo: (workflowId: string, currentNodes: Node[], currentEdges: Edge[]) => WorkflowSnapshot | null;
    canUndo: (workflowId: string) => boolean;
    canRedo: (workflowId: string) => boolean;
    clearHistory: (workflowId: string) => void;
}

const getOrCreateHistory = (
    histories: Record<string, WorkflowHistoryEntry>,
    workflowId: string
): WorkflowHistoryEntry => {
    return histories[workflowId] ?? {past: [], future: []};
};

export const useWorkflowHistoryState = createWithEqualityFn<WorkflowHistoryState>(
    (set, get) => ({
        histories: {},

        takeSnapshot: (workflowId, nodes, edges) => {
            set((state) => {
                const history = getOrCreateHistory(state.histories, workflowId);
                const snapshot: WorkflowSnapshot = {
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
                        [workflowId]: {
                            past: newPast,
                            future: [], // Clear redo stack on new action
                        },
                    },
                };
            });
        },

        undo: (workflowId, currentNodes, currentEdges) => {
            const history = getOrCreateHistory(get().histories, workflowId);
            if (history.past.length === 0) return null;

            const newPast = [...history.past];
            const previous = newPast.pop()!;

            const currentSnapshot: WorkflowSnapshot = {
                nodes: structuredClone(currentNodes),
                edges: structuredClone(currentEdges),
            };

            set((state) => ({
                histories: {
                    ...state.histories,
                    [workflowId]: {
                        past: newPast,
                        future: [currentSnapshot, ...history.future],
                    },
                },
            }));

            return previous;
        },

        redo: (workflowId, currentNodes, currentEdges) => {
            const history = getOrCreateHistory(get().histories, workflowId);
            if (history.future.length === 0) return null;

            const newFuture = [...history.future];
            const next = newFuture.shift()!;

            const currentSnapshot: WorkflowSnapshot = {
                nodes: structuredClone(currentNodes),
                edges: structuredClone(currentEdges),
            };

            set((state) => ({
                histories: {
                    ...state.histories,
                    [workflowId]: {
                        past: [...history.past, currentSnapshot],
                        future: newFuture,
                    },
                },
            }));

            return next;
        },

        canUndo: (workflowId) => {
            const history = get().histories[workflowId];
            return history ? history.past.length > 0 : false;
        },

        canRedo: (workflowId) => {
            const history = get().histories[workflowId];
            return history ? history.future.length > 0 : false;
        },

        clearHistory: (workflowId) => {
            set((state) => ({
                histories: {
                    ...state.histories,
                    [workflowId]: {past: [], future: []},
                },
            }));
        },
    })
);
