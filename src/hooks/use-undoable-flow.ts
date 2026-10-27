import {useCallback, useEffect, useMemo, useRef} from 'react';
import {Edge, Node, Viewport, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange} from '@xyflow/react';
import {create} from 'zustand';
import {useCanvasHistoryState} from '@/state/canvas-history.state';
import {useFile, useWorkspace} from '@/state/workspace/workspace.state';
import {readCanvas, refEdges, writeCanvas} from '@/components/canvas/logic/canvas-file';

const SNAPSHOT_DEBOUNCE_MS = 1000;
const VIEWPORT_DEBOUNCE_MS = 300;

/**
 * A canvas while it is open: its nodes as read from its file, plus what the file doesn't hold. The edges follow
 * from the `refs` of the query nodes; only their look, selection and which ones were deleted are kept here.
 */
interface CanvasMemory {
    nodes: Node[];
    /** The file text `nodes` were read from or last written as. */
    text: string;
    edgeState: Record<string, Pick<Edge, 'data' | 'selected'>>;
    hiddenEdges: Set<string>;
    viewport?: Viewport;
}

const useCanvasMemory = create<{ canvases: Record<string, CanvasMemory> }>(() => ({canvases: {}}));

const memoryOf = (path: string) => useCanvasMemory.getState().canvases[path];
const putMemory = (path: string, memory: CanvasMemory) =>
    useCanvasMemory.setState(s => ({canvases: {...s.canvases, [path]: memory}}));


/** Keeps `nodes` and, unless a drag or resize is still under way, writes them to the canvas file. */
function commitNodes(path: string, nodes: Node[], save: boolean) {
    const memory = memoryOf(path);
    if (!memory) return;
    const text = save ? writeCanvas(nodes) : memory.text;
    putMemory(path, {...memory, nodes, text});
    if (text !== memory.text) void useWorkspace.getState().write(path, text);
}

function deriveEdges(memory: CanvasMemory | undefined, nodes: Node[]): Edge[] {
    return refEdges(nodes)
        .filter(edge => !memory?.hiddenEdges.has(edge.id))
        .map(edge => ({...edge, ...memory?.edgeState[edge.id]}));
}

const nodesOf = (path: string) => memoryOf(path)?.nodes ?? [];
const edgesOf = (path: string) => deriveEdges(memoryOf(path), nodesOf(path));

/** The canvas file at `path` as React Flow state, with undo and redo. */
export function useUndoableFlow(path: string) {
    const text = useFile(path) ?? '';
    const stored = useCanvasMemory(s => s.canvases[path]);
    // Read again when the file changed outside the canvas, e.g. in its text or on disk.
    const memory = useMemo((): CanvasMemory => stored && stored.text === text ? stored : {
        ...(stored ?? {edgeState: {}, hiddenEdges: new Set()}), nodes: readCanvas(text, stored?.nodes ?? []), text,
    }, [stored, text]);
    useEffect(() => {
        if (memory !== memoryOf(path)) putMemory(path, memory);
    }, [path, memory]);

    const {takeSnapshot, undo, redo, canUndo, canRedo} = useCanvasHistoryState();

    const nodes = memory.nodes;
    const edges = useMemo(() => deriveEdges(memory, nodes), [memory, nodes]);
    const viewport = memory.viewport;

    const lastSnapshotTime = useRef<number>(0);

    const maybeSnapshot = useCallback(() => {
        const now = Date.now();
        if (now - lastSnapshotTime.current > SNAPSHOT_DEBOUNCE_MS) {
            takeSnapshot(path, nodesOf(path), edgesOf(path));
            lastSnapshotTime.current = now;
        }
    }, [path, takeSnapshot]);

    const setNodes = useCallback((nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => {
        maybeSnapshot();
        const next = typeof nodesOrUpdater === 'function' ? nodesOrUpdater(nodesOf(path)) : nodesOrUpdater;
        commitNodes(path, next, true);
    }, [path, maybeSnapshot]);

    const keepEdges = useCallback((next: Edge[]) => {
        const memory = memoryOf(path);
        if (!memory) return;
        const kept = new Set(next.map(e => e.id));
        const hiddenEdges = new Set(memory.hiddenEdges);
        for (const edge of edgesOf(path)) if (!kept.has(edge.id)) hiddenEdges.add(edge.id);
        const edgeState = {...memory.edgeState};
        for (const edge of next) edgeState[edge.id] = {data: edge.data, selected: edge.selected};
        putMemory(path, {...memory, edgeState, hiddenEdges});
    }, [path]);

    const setEdges = useCallback((edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => {
        keepEdges(typeof edgesOrUpdater === 'function' ? edgesOrUpdater(edgesOf(path)) : edgesOrUpdater);
    }, [path, keepEdges]);

    const onNodesChange: OnNodesChange = useCallback((changes) => {
        maybeSnapshot();
        // A drag or resize is saved once it ends.
        const gesture = changes.some(c => c.type === 'position' && c.dragging || c.type === 'dimensions' && c.resizing);
        commitNodes(path, applyNodeChanges(changes, nodesOf(path)), !gesture);
    }, [path, maybeSnapshot]);

    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
        keepEdges(applyEdgeChanges(changes, edgesOf(path)));
    }, [path, keepEdges]);

    const handleUndo = useCallback(() => {
        const snapshot = undo(path, nodesOf(path), edgesOf(path));
        if (snapshot) commitNodes(path, snapshot.nodes, true);
    }, [path, undo]);

    const handleRedo = useCallback(() => {
        const snapshot = redo(path, nodesOf(path), edgesOf(path));
        if (snapshot) commitNodes(path, snapshot.nodes, true);
    }, [path, redo]);

    const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onViewportChange = useCallback((newViewport: Viewport) => {
        if (viewportTimeoutRef.current) clearTimeout(viewportTimeoutRef.current);
        viewportTimeoutRef.current = setTimeout(() => {
            const memory = memoryOf(path);
            if (memory) putMemory(path, {...memory, viewport: newViewport});
        }, VIEWPORT_DEBOUNCE_MS);
    }, [path]);

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
        canUndo: canUndo(path),
        canRedo: canRedo(path),
    };
}
