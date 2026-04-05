import {useCallback, useRef} from 'react';
import {useHotkeys} from 'react-hotkeys-hook';
import {Node, Edge} from '@xyflow/react';
import {
    getSelectedNodes,
    getInternalEdges,
    cloneNodesForClipboard,
    cloneEdgesForClipboard,
    cloneNodes,
    cloneEdges,
} from '@/components/canvas/logic/clipboard-utils';

import {GRID_SIZE} from "@/components/canvas/logic/models";

interface ClipboardData {
    nodes: Node[];
    edges: Edge[];
}

interface UseFlowShortcutsOptions<E extends Edge = Edge> {
    nodes: Node[];
    edges: E[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<E[]>>;
    onUndo?: () => void;
    onRedo?: () => void;
}

export function useFlowShortcuts<E extends Edge = Edge>({
    nodes,
    edges,
    setNodes,
    setEdges,
    onUndo,
    onRedo,
}: UseFlowShortcutsOptions<E>) {
    const clipboardRef = useRef<ClipboardData | null>(null);
    const pasteCountRef = useRef(0);

    const hotkeyOptions = {
        enableOnFormTags: false as const,
        preventDefault: false,
    };

    const hasTextSelection = () => {
        const selection = window.getSelection();
        return selection !== null && selection.toString().length > 0;
    };

    const isTextInput = (e?: KeyboardEvent) =>
        e?.target instanceof HTMLElement && (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target.isContentEditable ||
            e.target.closest('.monaco-editor') !== null
        );

    const copySelectedNodes = useCallback((e?: KeyboardEvent) => {
        if (hasTextSelection() || isTextInput(e)) return;
        const selectedNodes = getSelectedNodes(nodes);
        if (selectedNodes.length === 0) return;

        e?.preventDefault();

        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
        const internalEdges = getInternalEdges(edges, selectedNodeIds);

        // Deep clone everything to avoid reference issues with state
        clipboardRef.current = {
            nodes: cloneNodesForClipboard(selectedNodes),
            edges: cloneEdgesForClipboard(internalEdges),
        };
        pasteCountRef.current = 0;
    }, [nodes, edges]);

    const pasteNodes = useCallback((e?: KeyboardEvent) => {
        if (isTextInput(e)) return;
        if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return;

        e?.preventDefault();

        pasteCountRef.current += 1;
        const offset = {
            x: GRID_SIZE * pasteCountRef.current,
            y: GRID_SIZE * pasteCountRef.current,
        };

        const idMapping = new Map<string, string>();
        const clonedNodes = cloneNodes(clipboardRef.current.nodes, idMapping, offset);
        const copiedNodeIds = new Set(clipboardRef.current.nodes.map(n => n.id));
        const clonedEdges = cloneEdges(clipboardRef.current.edges, copiedNodeIds, idMapping);

        // Deselect existing nodes/edges and add cloned ones
        setNodes(nds => [
            ...nds.map(n => ({...n, selected: false})),
            ...clonedNodes,
        ]);
        setEdges(eds => [
            ...eds.map(e => ({...e, selected: false})),
            ...clonedEdges as E[],
        ]);
    }, [setNodes, setEdges]);

    const duplicateSelectedNodes = useCallback((e?: KeyboardEvent) => {
        if (isTextInput(e)) return;
        const selectedNodes = getSelectedNodes(nodes);
        if (selectedNodes.length === 0) return;

        e?.preventDefault();

        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
        const internalEdges = getInternalEdges(edges, selectedNodeIds);

        const offset = {x: GRID_SIZE, y: GRID_SIZE};
        const idMapping = new Map<string, string>();
        const clonedNodes = cloneNodes(selectedNodes, idMapping, offset);
        const clonedEdges = cloneEdges(internalEdges, selectedNodeIds, idMapping);

        // Deselect existing nodes/edges and add cloned ones
        setNodes(nds => [
            ...nds.map(n => ({...n, selected: false})),
            ...clonedNodes,
        ]);
        setEdges(eds => [
            ...eds.map(e => ({...e, selected: false})),
            ...clonedEdges as E[],
        ]);
    }, [nodes, edges, setNodes, setEdges]);

    useHotkeys('ctrl+c,mod+c', copySelectedNodes, hotkeyOptions);
    useHotkeys('ctrl+v,mod+v', pasteNodes, hotkeyOptions);
    useHotkeys('ctrl+d,mod+d', duplicateSelectedNodes, {...hotkeyOptions, preventDefault: true});
    useHotkeys('ctrl+z,mod+z', (e) => { if (isTextInput(e)) return; if (onUndo) { e.preventDefault(); onUndo(); } }, hotkeyOptions);
    useHotkeys('ctrl+shift+z,mod+shift+z,ctrl+y,mod+y', (e) => { if (isTextInput(e)) return; if (onRedo) { e.preventDefault(); onRedo(); } }, hotkeyOptions);
}
