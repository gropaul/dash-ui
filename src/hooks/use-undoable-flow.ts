import {useCallback, useRef} from 'react';
import {Edge, Node, Viewport, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange} from '@xyflow/react';
import {useRelationsState} from '@/state/relations.state';
import {useCanvasHistoryState} from '@/state/canvas-history.state';
import {shallow} from 'zustand/shallow';

const SNAPSHOT_DEBOUNCE_MS = 1000;
const VIEWPORT_DEBOUNCE_MS = 300;

const DEFAULT_VIEWPORT: Viewport = {x: 0, y: 0, zoom: 1};

export function useUndoableFlow(canvasId: string) {
    const canvas = useRelationsState((state) => state.canvas[canvasId], shallow);
    const updateCanvasState = useRelationsState((state) => state.updateCanvasState);
    const {takeSnapshot, undo, redo, canUndo, canRedo} = useCanvasHistoryState();

    const nodes = canvas?.nodes ?? [];
    const edges = canvas?.edges ?? [];
    const viewport = canvas?.viewport ?? DEFAULT_VIEWPORT;

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
            takeSnapshot(canvasId, lastNodesRef.current, lastEdgesRef.current);
            lastSnapshotTime.current = now;
        }
    }, [canvasId, takeSnapshot]);

    const setNodes = useCallback((nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => {
        maybeSnapshot();
        const newNodes = typeof nodesOrUpdater === 'function'
            ? nodesOrUpdater(lastNodesRef.current)
            : nodesOrUpdater;
        updateCanvasState(canvasId, {nodes: newNodes});
    }, [canvasId, updateCanvasState, maybeSnapshot]);

    const setEdges = useCallback((edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => {
        maybeSnapshot();
        const newEdges = typeof edgesOrUpdater === 'function'
            ? edgesOrUpdater(lastEdgesRef.current)
            : edgesOrUpdater;
        updateCanvasState(canvasId, {edges: newEdges});
    }, [canvasId, updateCanvasState, maybeSnapshot]);

    const onNodesChange: OnNodesChange = useCallback((changes) => {
        maybeSnapshot();
        const newNodes = applyNodeChanges(changes, lastNodesRef.current);
        updateCanvasState(canvasId, {nodes: newNodes});
    }, [canvasId, updateCanvasState, maybeSnapshot]);

    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
        maybeSnapshot();
        const newEdges = applyEdgeChanges(changes, lastEdgesRef.current);
        updateCanvasState(canvasId, {edges: newEdges});
    }, [canvasId, updateCanvasState, maybeSnapshot]);

    const handleUndo = useCallback(() => {
        const snapshot = undo(canvasId, lastNodesRef.current, lastEdgesRef.current);
        if (snapshot) {
            updateCanvasState(canvasId, {nodes: snapshot.nodes, edges: snapshot.edges});
        }
    }, [canvasId, undo, updateCanvasState]);

    const handleRedo = useCallback(() => {
        const snapshot = redo(canvasId, lastNodesRef.current, lastEdgesRef.current);
        if (snapshot) {
            updateCanvasState(canvasId, {nodes: snapshot.nodes, edges: snapshot.edges});
        }
    }, [canvasId, redo, updateCanvasState]);

    // Debounce viewport updates
    const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onViewportChange = useCallback((newViewport: Viewport) => {
        if (viewportTimeoutRef.current) {
            clearTimeout(viewportTimeoutRef.current);
        }
        viewportTimeoutRef.current = setTimeout(() => {
            updateCanvasState(canvasId, {viewport: newViewport});
        }, VIEWPORT_DEBOUNCE_MS);
    }, [canvasId, updateCanvasState]);

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
        canUndo: canUndo(canvasId),
        canRedo: canRedo(canvasId),
    };
}