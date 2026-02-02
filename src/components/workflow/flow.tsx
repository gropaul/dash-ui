'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    addEdge,
    Background,
    Connection,
    ConnectionMode,
    Controls,
    getOutgoers,
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
import {FreeDrawNode} from "@/components/workflow/nodes/free-draw-node";
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
import {INITIAL_CANVAS_STATE, CanvasState, CanvasStateFreeDraw} from "@/components/workflow/models";
import {NodePreview} from "@/components/workflow/node-preview";
import {FreeDrawPreview} from "@/components/workflow/free-draw-preview";

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

export type NodeType = 'relationNode' | 'chartNode' | 'textNode' | 'freeDrawNode';

const nodeTypes: { [key in NodeType]: React.FC<any> } = {
    relationNode: RelationNode,
    chartNode: RelationNode, // Template - uses RelationNode for now
    textNode: RelationNode,  // Template - uses RelationNode for now
    freeDrawNode: FreeDrawNode,
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
    size: { width: number; height: number };
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
    const {screenToFlowPosition, getIntersectingNodes, getNodes, getEdges} = useReactFlow();
    const connectingFrom = useRef<OnConnectStartParams | null>(null);

    const checkConnectionValidity = useCallback(
        (sourceId: string, targetId: string): { isValid: boolean; reason?: 'cycle' | 'duplicate' } => {
            const currentNodes = getNodes();
            const currentEdges = getEdges();

            // Check for duplicate edge
            const isDuplicate = currentEdges.some(
                edge => edge.source === sourceId && edge.target === targetId
            );
            if (isDuplicate) {
                return {isValid: false, reason: 'duplicate'};
            }

            // Check for self-connection
            if (sourceId === targetId) {
                return {isValid: false, reason: 'cycle'};
            }

            // Check for cycle
            const target = currentNodes.find(node => node.id === targetId);
            if (!target) return {isValid: true};

            const hasCycle = (node: Node, visited = new Set<string>()): boolean => {
                if (visited.has(node.id)) return false;
                visited.add(node.id);

                for (const outgoer of getOutgoers(node, currentNodes, currentEdges)) {
                    if (outgoer.id === sourceId) return true;
                    if (hasCycle(outgoer, visited)) return true;
                }
                return false;
            };

            if (hasCycle(target)) {
                return {isValid: false, reason: 'cycle'};
            }

            return {isValid: true};
        },
        [getNodes, getEdges],
    );

    const isValidConnection = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return false;
            return checkConnectionValidity(connection.source, connection.target).isValid;
        },
        [checkConnectionValidity],
    );

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

                // Only create edge if connection is valid
                const validity = checkConnectionValidity(sourceNodeId, targetNode.id);
                if (validity.isValid) {
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
                    connectingFrom.current = null;
                    setCanvasState(prev => ({...prev, connectionHover: null}));
                } else {
                    // Trigger shake animation
                    setCanvasState(prev => ({
                        ...prev,
                        connectionHover: {
                            nodeId: targetNode.id,
                            isValid: false,
                            invalidReason: validity.reason,
                            shake: true,
                        },
                    }));
                    connectingFrom.current = null;
                    // Clear after animation
                    setTimeout(() => {
                        setCanvasState(prev => ({...prev, connectionHover: null}));
                    }, 400);
                }
                return;
            }

            connectingFrom.current = null;
            setCanvasState(prev => ({...prev, connectionHover: null}));
        },
        [screenToFlowPosition, getIntersectingNodes, setEdges, checkConnectionValidity],
    );

    const onNodeMouseEnter = useCallback(
        (_: React.MouseEvent, node: Node) => {
            if (connectingFrom.current && node.id !== connectingFrom.current.nodeId && node.type === 'relationNode') {
                const sourceId = connectingFrom.current.nodeId;
                if (!sourceId) return;

                const validity = checkConnectionValidity(sourceId, node.id);
                setCanvasState(prev => ({
                    ...prev,
                    connectionHover: {
                        nodeId: node.id,
                        isValid: validity.isValid,
                        invalidReason: validity.reason,
                    },
                }));
            }
        },
        [checkConnectionValidity],
    );

    const onNodeMouseLeave = useCallback(
        () => {
            if (connectingFrom.current) {
                setCanvasState(prev => ({...prev, connectionHover: null}));
            }
        },
        [],
    );

    const nodesWithConnectionHover = useMemo(() => {
        return nodes.map(node => {
            const isHovered = canvasState.connectionHover?.nodeId === node.id;
            return {
                ...node,
                data: {
                    ...node.data,
                    connectionHover: isHovered ? canvasState.connectionHover : null,
                },
            };
        });
    }, [nodes, canvasState.connectionHover]);

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
                nodes={nodesWithConnectionHover}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                isValidConnection={isValidConnection}
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
                <FreeDrawPreview
                    currentStroke={canvasState.selectedTool === 'free-draw' ? (canvasState as CanvasStateFreeDraw).currentStroke : undefined}
                />
                <FlowPalette canvasState={canvasState} setCanvasState={setCanvasState}/>
            </ReactFlow>
        </div>
    );
}
