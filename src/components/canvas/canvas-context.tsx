'use client'

import {createContext, useContext, ReactNode} from 'react';
import {Node, Edge} from '@xyflow/react';

type SetNodes = (nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => void;
type SetEdges = (edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
type GetNodes = () => Node[];
type GetEdges = () => Edge[];

interface CanvasContextValue {
    setNodes: SetNodes;
    setEdges: SetEdges;
    getNodes: GetNodes;
    getEdges: GetEdges;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({
    children,
    setNodes,
    setEdges,
    getNodes,
    getEdges,
}: {
    children: ReactNode;
    setNodes: SetNodes;
    setEdges: SetEdges;
    getNodes: GetNodes;
    getEdges: GetEdges;
}) {
    return (
        <CanvasContext.Provider value={{setNodes, setEdges, getNodes, getEdges}}>
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
