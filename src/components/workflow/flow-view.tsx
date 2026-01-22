'use client'

import {useCallback} from 'react';
import {
    addEdge,
    Background,
    Connection,
    ConnectionMode,
    Controls,
    MarkerType,
    ReactFlow,
    useEdgesState,
    useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {RelationNode} from "@/components/workflow/nodes/relation";
import FloatingEdge from "@/components/workflow/edge/floating-edge";

import './flow-theme.css';

const initialNodes = [
    {
        id: 'n1',
        type: 'relationNode',
        position: { x: 0, y: 0 },
        data: { },
    },
    {
        id: 'n2',
        type: 'relationNode',
        position: { x: 10, y: 0 },
        width: 512,
        height: 256,
        data: { },
    },
];

export type NodeType = 'relationNode';

const nodeTypes: { [key in NodeType]: React.FC<any> } = {
    relationNode: RelationNode,
};

const edgeTypes = {
    floating: FloatingEdge,
};

const initialEdges = [
    {
        id: '1-2',
        source: 'n1',
        target: 'n2',
        sourceHandle: 'c',
        targetHandle: 'a',
        type: 'floating',
        markerEnd: { type: MarkerType.ArrowClosed },
    },
];

export function FlowView(){

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (connection: Connection) =>
            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        type: 'floating',
                        markerEnd: { type: MarkerType.Arrow },
                    },
                    eds,
                ),
            ),
        [],
    );

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}

                panOnScroll={true}
                panOnScrollSpeed={1.5}
                panOnDrag={false}
                zoomOnScroll={false}  // disable zoom on scroll if needed

                connectionRadius={32}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}
