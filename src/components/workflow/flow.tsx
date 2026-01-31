'use client'

import {useCallback, useEffect, useRef, useState} from 'react';
import {
    addEdge,
    Background,
    Connection,
    ConnectionMode,
    Controls,
    MarkerType,
    Node,
    OnConnectStartParams,
    ReactFlow,
    SelectionMode,
    useEdgesState,
    useNodesState,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {RelationNode} from "@/components/workflow/nodes/relation";
import FloatingEdge from "@/components/workflow/edge/floating-edge";
import {FlowPalette} from "@/components/workflow/flow-palette";
import {
    getCursorStyle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    PointerHandlerContext,
} from "@/components/workflow/flow-pointer-functions";

import './flow-theme.css';
import {INITIAL_CANVAS_STATE, CanvasState} from "@/components/workflow/models";
import {NodePreview} from "@/components/workflow/node-preview";

const initialNodes: Node[] = [
    {
        id: 'n1',
        type: 'relationNode',
        position: {x: 0, y: 0},
        data: {},
    },
    {
        id: 'n2',
        type: 'relationNode',
        position: {x: 10, y: 0},
        width: 512,
        height: 256,
        data: {},
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

export function Flow() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [canvasState, setCanvasState] = useState<CanvasState>(INITIAL_CANVAS_STATE);
    const {screenToFlowPosition, getIntersectingNodes} = useReactFlow();
    const connectingFrom = useRef<OnConnectStartParams | null>(null);

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

    const onConnectStart = useCallback((_: any, params: OnConnectStartParams) => {
        connectingFrom.current = params;
    }, []);

    const onConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent) => {
            if (!connectingFrom.current) return;

            const {nodeId: sourceNodeId, handleId: sourceHandleId} = connectingFrom.current;
            if (!sourceNodeId) return;

            // Get the drop position
            const clientX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX;
            const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY;
            const dropPosition = screenToFlowPosition({x: clientX, y: clientY});

            // Find nodes at drop position
            const intersectingNodes = getIntersectingNodes({
                x: dropPosition.x,
                y: dropPosition.y,
                width: 1,
                height: 1,
            }).filter(n => n.id !== sourceNodeId);

            if (intersectingNodes.length > 0) {
                const targetNode = intersectingNodes[0];

                setEdges((eds) =>
                    addEdge(
                        {
                            source: sourceNodeId,
                            target: targetNode.id,
                            sourceHandle: sourceHandleId,
                            targetHandle: null,
                            type: 'floating',
                            markerEnd: {
                                type: MarkerType.Arrow,
                                width: 30,
                                height: 30,
                            },
                        },
                        eds,
                    ),
                );
            }

            connectingFrom.current = null;
        },
        [screenToFlowPosition, getIntersectingNodes, setEdges],
    );

    const pointerCtx: PointerHandlerContext = {
        canvasState,
        setCanvasState,
        nodes,
        setNodes,
        screenToFlowPosition,
    };

    const cursorStyle = getCursorStyle(canvasState);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setCanvasState({selectedTool: 'pointer'});
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div
            style={{width: '100%', height: '100%'}}
            onPointerMove={(e) => handlePointerMove(e, pointerCtx)}
            onPointerDown={(e) => handlePointerDown(e, pointerCtx)}
            onPointerUp={(e) => handlePointerUp(e, pointerCtx)}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                panOnScroll={true}
                panOnScrollSpeed={1.5}
                panOnDrag={canvasState.selectedTool === 'drag-canvas' ? true : [1]}
                style={{cursor: cursorStyle}}
                zoomOnScroll={false}
                selectionOnDrag={canvasState.selectedTool === 'pointer'}
                selectionMode={SelectionMode.Partial}
                connectionRadius={32}
                edgesFocusable={true}
                defaultEdgeOptions={{interactionWidth: 20}}
            >
                <Background/>
                <Controls/>
                <NodePreview canvasState={canvasState}/>
                <FlowPalette canvasState={canvasState} setCanvasState={setCanvasState}/>
            </ReactFlow>
        </div>
    );
}
