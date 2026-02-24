import {useCallback, useRef} from 'react';
import {Edge, Node, Viewport, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange} from '@xyflow/react';
import {useRelationsState} from '@/state/relations.state';
import {useWorkflowHistoryState} from '@/state/workflow-history.state';
import {shallow} from 'zustand/shallow';

const SNAPSHOT_DEBOUNCE_MS = 1000;
const VIEWPORT_DEBOUNCE_MS = 300;

const DEFAULT_VIEWPORT: Viewport = {x: 0, y: 0, zoom: 1};

export function useUndoableFlow(workflowId: string) {
    const workflow = useRelationsState((state) => state.workflows[workflowId], shallow);
    const updateWorkflowState = useRelationsState((state) => state.updateWorkflowState);
    const {takeSnapshot, undo, redo, canUndo, canRedo} = useWorkflowHistoryState();

    const nodes = workflow?.nodes ?? [];
    const edges = workflow?.edges ?? [];
    const viewport = workflow?.viewport ?? DEFAULT_VIEWPORT;

    // Track last snapshot time to debounce
    const lastSnapshotTime = useRef<number>(0);
    const lastNodesRef = useRef<Node[]>(nodes);
    const lastEdgesRef = useRef<Edge[]>(edges);

    // Keep refs updated
    lastNodesRef.current = nodes;
    lastEdgesRef.current = edges;

    const maybeSnapshot = useCallback(() => {
        const now = Date.now();
        if (now - lastSnapshotTime.current > SNAPSHOT_DEBOUNCE_MS) {
            takeSnapshot(workflowId, lastNodesRef.current, lastEdgesRef.current);
            lastSnapshotTime.current = now;
        }
    }, [workflowId, takeSnapshot]);

    const setNodes = useCallback((nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => {
        maybeSnapshot();
        const newNodes = typeof nodesOrUpdater === 'function'
            ? nodesOrUpdater(lastNodesRef.current)
            : nodesOrUpdater;
        updateWorkflowState(workflowId, {nodes: newNodes});
    }, [workflowId, updateWorkflowState, maybeSnapshot]);

    const setEdges = useCallback((edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => {
        maybeSnapshot();
        const newEdges = typeof edgesOrUpdater === 'function'
            ? edgesOrUpdater(lastEdgesRef.current)
            : edgesOrUpdater;
        updateWorkflowState(workflowId, {edges: newEdges});
    }, [workflowId, updateWorkflowState, maybeSnapshot]);

    const onNodesChange: OnNodesChange = useCallback((changes) => {
        maybeSnapshot();
        const newNodes = applyNodeChanges(changes, lastNodesRef.current);
        updateWorkflowState(workflowId, {nodes: newNodes});
    }, [workflowId, updateWorkflowState, maybeSnapshot]);

    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
        maybeSnapshot();
        const newEdges = applyEdgeChanges(changes, lastEdgesRef.current);
        updateWorkflowState(workflowId, {edges: newEdges});
    }, [workflowId, updateWorkflowState, maybeSnapshot]);

    const handleUndo = useCallback(() => {
        const snapshot = undo(workflowId, lastNodesRef.current, lastEdgesRef.current);
        if (snapshot) {
            updateWorkflowState(workflowId, {nodes: snapshot.nodes, edges: snapshot.edges});
        }
    }, [workflowId, undo, updateWorkflowState]);

    const handleRedo = useCallback(() => {
        const snapshot = redo(workflowId, lastNodesRef.current, lastEdgesRef.current);
        if (snapshot) {
            updateWorkflowState(workflowId, {nodes: snapshot.nodes, edges: snapshot.edges});
        }
    }, [workflowId, redo, updateWorkflowState]);

    // Debounce viewport updates
    const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onViewportChange = useCallback((newViewport: Viewport) => {
        if (viewportTimeoutRef.current) {
            clearTimeout(viewportTimeoutRef.current);
        }
        viewportTimeoutRef.current = setTimeout(() => {
            updateWorkflowState(workflowId, {viewport: newViewport});
        }, VIEWPORT_DEBOUNCE_MS);
    }, [workflowId, updateWorkflowState]);

    return {
        nodes,
        edges,
        viewport,
        setNodes,
        setEdges,
        onNodesChange,
        onEdgesChange,
        onViewportChange,
        undo: handleUndo,
        redo: handleRedo,
        canUndo: canUndo(workflowId),
        canRedo: canRedo(workflowId),
    };
}