'use client'

import {createContext, useContext, ReactNode} from 'react';
import {Node, Edge} from '@xyflow/react';

type SetNodes = (nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => void;
type SetEdges = (edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
type GetNodes = () => Node[];
type GetEdges = () => Edge[];

interface CanvasContextValue {
    canvasId: string;
    setNodes: SetNodes;
    setEdges: SetEdges;
    getNodes: GetNodes;
    getEdges: GetEdges;
    openFullscreen: (nodeId: string) => void;
    /** The canvas is part of a page that scrolls (see Flow's `embedded`). */
    embedded: boolean;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({
    children,
    canvasId,
    setNodes,
    setEdges,
    getNodes,
    getEdges,
    openFullscreen,
    embedded,
}: {
    children: ReactNode;
    canvasId: string;
    setNodes: SetNodes;
    setEdges: SetEdges;
    getNodes: GetNodes;
    getEdges: GetEdges;
    openFullscreen: (nodeId: string) => void;
    embedded: boolean;
}) {
    return (
        <CanvasContext.Provider value={{canvasId, setNodes, setEdges, getNodes, getEdges, openFullscreen, embedded}}>
            {children}
        </CanvasContext.Provider>
    );
}

/**
 * Use this instead of useReactFlow().setNodes/setEdges to ensure
 * changes go through the undoable state management.
 */
export function useCanvasState() {
    const context = useContext(CanvasContext);
    if (!context) {
        throw new Error('useCanvasState must be used within a CanvasProvider');
    }
    return context;
}
