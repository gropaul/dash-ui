'use client'

import {useCallback, useRef, useState, MouseEvent} from 'react';
import {
    addEdge,
    Background,
    Connection,
    ConnectionMode,
    Controls,
    MarkerType,
    ReactFlow,
    SelectionMode,
    useEdgesState,
    useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {RelationNode} from "@/components/workflow/nodes/relation";
import FloatingEdge from "@/components/workflow/edge/floating-edge";
import {FlowPalette} from "@/components/workflow/flow-palette";

import './flow-theme.css';
import {INITIAL_CANVAS_STATE, CanvasState} from "@/components/workflow/models";
import {NodePreview} from "@/components/workflow/node-preview";

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

export type NodeType = 'relationNode' | 'chartNode' | 'textNode';

const nodeTypes: { [key in NodeType]: React.FC<any> } = {
    relationNode: RelationNode,
    chartNode: RelationNode, // Template - uses RelationNode for now
    textNode: RelationNode,  // Template - uses RelationNode for now
};

const edgeTypes = {
    floating: FloatingEdge,
};

export interface Position {
    x: number;
    y: number;
}

export interface NodeTemplate {
    type: NodeType;
    size: { width: number; height: number  };
}

const initialEdges = [
    {
        id: '1-2',
        source: 'n1',
        target: 'n2',
        sourceHandle: 'c',
        targetHandle: 'a',
        type: 'floating',
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 30,
            height: 30,
        },
    },
];

export function Flow(){
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const [canvasState, setCanvasState] = useState<CanvasState>(INITIAL_CANVAS_STATE);

    const onConnect = useCallback(
        (connection: Connection) =>
            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        type: 'floating',
                        markerEnd: {
                            type: MarkerType.Arrow,
                            width: 30,
                            height: 30,
                        },
                    },
                    eds,
                ),
            ),
        [],
    );

    function handleCreateNode(template: NodeTemplate, position: Position) {
        const newNode = {
            id: `n${nodes.length + 1}`,
            type: template.type,
            position,
            width: template.size.width,
            height: template.size.height,
            data: {},
        };
        setNodes((nds) => nds.concat(newNode));
    }

    function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (canvasState.selectedTool === 'create-node') {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            setCanvasState({
                ...canvasState,
                previewMousePosition: {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                },
            });
        }
    }

    let mouseType = 'default';
    switch (canvasState.selectedTool) {
        case 'pointer':
            mouseType = 'default';
            break;
        case 'drag-canvas':
            mouseType = 'grab';
            break;
        case 'create-node':
            mouseType = 'crosshair';
            break;
    }

    return (
        <div style={{ width: '100%', height: '100%' }}
            onPointerMove={onPointerMove}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}

                panOnScroll={true}
                panOnScrollSpeed={1.5}
                panOnDrag={canvasState.selectedTool === 'drag-canvas' ? true : [ 1]}
                style={{ cursor: mouseType }}
                zoomOnScroll={false}

                selectionOnDrag={canvasState.selectedTool === 'pointer'}
                selectionMode={SelectionMode.Partial}

                connectionRadius={32}

            >
                <Background />
                <Controls />
                <NodePreview canvasState={canvasState} />
                <FlowPalette canvasState={canvasState} setCanvasState={setCanvasState} onCreateNode={handleCreateNode} />
            </ReactFlow>
        </div>
    );
}
