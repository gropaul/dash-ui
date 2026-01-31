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
    useNodesState, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {RelationNode} from "@/components/workflow/nodes/relation";
import FloatingEdge from "@/components/workflow/edge/floating-edge";
import {FlowPalette} from "@/components/workflow/flow-palette";

import './flow-theme.css';
import {INITIAL_CANVAS_STATE, CanvasState, CanvasStateNodeCreation} from "@/components/workflow/models";
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
    const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();

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

    function createNewNoe(template: NodeTemplate, position: Position) {
        const newNode = {
            id: `n${nodes.length + 1}`,
            type: template.type,
            position,
            width: template.size.width,
            height: template.size.height,
            selected: true,
            data: {},
        };
        setNodes((nds) => nds.concat(newNode));
    }

    function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (canvasState.selectedTool !== 'create-node') return;

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const currentPos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        // Check if we're in sizing mode (dragging)
        if (canvasState.selectedTool == 'create-node' && canvasState.sizing) {
            setCanvasState({
                ...canvasState,
                previewMousePosition: currentPos,
                sizing: {
                    ...canvasState.sizing,
                    endPosition: currentPos,
                },
            });
        } else {
            setCanvasState({
                ...canvasState,
                previewMousePosition: currentPos,
            });
        }
    }

    function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if (canvasState.selectedTool !== 'create-node' || !canvasState.previewMousePosition) return;

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const position = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        // Start sizing mode
        setCanvasState({
            ...canvasState,
            sizing: {
                startPosition: position,
                endPosition: position,
            },
        });
    }

    function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
        if (canvasState.selectedTool !== 'create-node' || !canvasState.sizing) return;

        event.preventDefault();

        const start = canvasState.sizing.startPosition;
        const end = canvasState.sizing.endPosition;

        // Calculate size from drag distance
        const dragDistance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );

        // If drag is minimal (< 5px), use default size, otherwise use calculated size
        let nodeScreenSize;
        if (dragDistance < 5) {
            // Simple click - use default size
            nodeScreenSize = canvasState.nodeAdded.size;
        } else {
            // Dragged - calculate size from bounding box
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);
            nodeScreenSize = { width: Math.max(width, 100), height: Math.max(height, 100) };
        }

        // Get top-left corner position (in case user dragged backwards)
        const topLeftX = Math.min(start.x, end.x);
        const topLeftY = Math.min(start.y, end.y);

        const screenTopLeft = {
            x: event.currentTarget.getBoundingClientRect().left + topLeftX,
            y: event.currentTarget.getBoundingClientRect().top + topLeftY,
        };

        const flowTopLeft = screenToFlowPosition(screenTopLeft);

        const flowLowerRight = screenToFlowPosition({
            x: screenTopLeft.x + nodeScreenSize.width,
            y: screenTopLeft.y + nodeScreenSize.height,
        });

        const flowNodeSize = {
            width: flowLowerRight.x - flowTopLeft.x,
            height: flowLowerRight.y - flowTopLeft.y,
        }

        // Create node with calculated size
        const template = {
            ...canvasState.nodeAdded,
            size: flowNodeSize,
        };
        createNewNoe(template, flowTopLeft);

        // Reset to pointer tool
        setCanvasState({
            selectedTool: 'pointer',
        });
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
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
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
                <FlowPalette canvasState={canvasState} setCanvasState={setCanvasState} />
            </ReactFlow>
        </div>
    );
}
