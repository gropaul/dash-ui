'use client'

import { useState, useCallback } from 'react';
import {ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, Controls} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {FromNode} from "@/components/workflow/nodes/from";
import {WhereNode} from "@/components/workflow/nodes/where";

const initialNodes = [
    {
        id: 'n1',
        type: 'fromNode',
        position: { x: 0, y: 0 },
        data: { },
    },
    {
        id: 'n2',
        type: 'whereNode',
        position: { x: 200, y: 0 },
        data: {

        },
    }
];
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export type NodeType = 'fromNode' | 'whereNode';

const nodeTypes: { [key in NodeType]: React.FC<any> } = {
    fromNode: FromNode,
    whereNode: WhereNode
};

export function FlowView(){
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);

    const onNodesChange = useCallback(
        (changes: any) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: any) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
        [],
    );
    const onConnect = useCallback(
        (params: any) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
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
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}
