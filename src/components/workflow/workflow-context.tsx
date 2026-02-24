'use client'

import {createContext, useContext, ReactNode} from 'react';
import {Node, Edge} from '@xyflow/react';

type SetNodes = (nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => void;
type SetEdges = (edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => void;

interface WorkflowContextValue {
    setNodes: SetNodes;
    setEdges: SetEdges;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({
    children,
    setNodes,
    setEdges,
}: {
    children: ReactNode;
    setNodes: SetNodes;
    setEdges: SetEdges;
}) {
    return (
        <WorkflowContext.Provider value={{setNodes, setEdges}}>
            {children}
        </WorkflowContext.Provider>
    );
}

/**
 * Use this instead of useReactFlow().setNodes/setEdges to ensure
 * changes go through the undoable state management.
 */
export function useWorkflowState() {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error('useWorkflowState must be used within a WorkflowProvider');
    }
    return context;
}
