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

/** Reads the file again when it changed outside the canvas, e.g. in its text or on disk. */
function memoryFor(path: string, text: string): CanvasMemory {
    const memory = memoryOf(path);
    if (memory && memory.text === text) return memory;
    return {...memory, edgeState: memory?.edgeState ?? {}, hiddenEdges: memory?.hiddenEdges ?? new Set(), nodes: readCanvas(text, memory?.nodes ?? []), text};
}

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

/** The canvas file at `path` as React Flow state, with undo and redo. */
export function useUndoableFlow(path: string) {
    const text = useFile(path) ?? '';
    const stored = useCanvasMemory(s => s.canvases[path]);
    const memory = useMemo(() => stored && stored.text === text ? stored : memoryFor(path, text), [stored, path, text]);
    useEffect(() => {
        if (memory !== memoryOf(path)) putMemory(path, memory);
    }, [path, memory]);

    const {takeSnapshot, undo, redo, canUndo, canRedo} = useCanvasHistoryState();

    const nodes = memory.nodes;
    const edges = useMemo(() => deriveEdges(memory, nodes), [memory, nodes]);
    const viewport = memory.viewport;

    const lastSnapshotTime = useRef<number>(0);
    const currentNodes = () => memoryOf(path)?.nodes ?? nodes;
    const currentEdges = () => deriveEdges(memoryOf(path), currentNodes());

    const maybeSnapshot = useCallback(() => {
        const now = Date.now();
        if (now - lastSnapshotTime.current > SNAPSHOT_DEBOUNCE_MS) {
            takeSnapshot(path, currentNodes(), currentEdges());
            lastSnapshotTime.current = now;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, takeSnapshot]);

    const setNodes = useCallback((nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => {
        maybeSnapshot();
        const next = typeof nodesOrUpdater === 'function' ? nodesOrUpdater(currentNodes()) : nodesOrUpdater;
        commitNodes(path, next, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, maybeSnapshot]);

    const keepEdges = useCallback((next: Edge[]) => {
        const memory = memoryOf(path);
        if (!memory) return;
        const kept = new Set(next.map(e => e.id));
        const hiddenEdges = new Set(memory.hiddenEdges);
        for (const edge of currentEdges()) if (!kept.has(edge.id)) hiddenEdges.add(edge.id);
        const edgeState = {...memory.edgeState};
        for (const edge of next) edgeState[edge.id] = {data: edge.data, selected: edge.selected};
        putMemory(path, {...memory, edgeState, hiddenEdges});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);

    const setEdges = useCallback((edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => {
        keepEdges(typeof edgesOrUpdater === 'function' ? edgesOrUpdater(currentEdges()) : edgesOrUpdater);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keepEdges]);

    const onNodesChange: OnNodesChange = useCallback((changes) => {
        maybeSnapshot();
        // A drag or resize is saved once it ends.
        const gesture = changes.some(c => c.type === 'position' && c.dragging || c.type === 'dimensions' && c.resizing);
        commitNodes(path, applyNodeChanges(changes, currentNodes()), !gesture);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, maybeSnapshot]);

    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
        keepEdges(applyEdgeChanges(changes, currentEdges()));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keepEdges]);

    const handleUndo = useCallback(() => {
        const snapshot = undo(path, currentNodes(), currentEdges());
        if (snapshot) commitNodes(path, snapshot.nodes, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, undo]);

    const handleRedo = useCallback(() => {
        const snapshot = redo(path, currentNodes(), currentEdges());
        if (snapshot) commitNodes(path, snapshot.nodes, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, redo]);

    const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onViewportChange = useCallback((newViewport: Viewport) => {
        if (viewportTimeoutRef.current) {
            clearTimeout(viewportTimeoutRef.current);
        }
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
