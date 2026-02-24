import {
    addEdge,
    Connection,
    Edge,
    getOutgoers,
    IsValidConnection,
    MarkerType,
    Node,
    OnConnectStartParams,
} from '@xyflow/react';
import {Dispatch, MutableRefObject, SetStateAction} from 'react';
import {CanvasState} from "@/components/workflow/models";

export interface ConnectionValidity {
    isValid: boolean;
    reason?: 'cycle' | 'duplicate';
}

export interface EdgeHandlerContext {
    getNodes: () => Node[];
    getEdges: () => Edge[];
    setEdges: Dispatch<SetStateAction<Edge[]>>;
    setCanvasState: Dispatch<SetStateAction<CanvasState>>;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    getIntersectingNodes: (rect: { x: number; y: number; width: number; height: number }) => Node[];
    connectingFrom: MutableRefObject<OnConnectStartParams | null>;
}

export function checkConnectionValidity(
    sourceId: string,
    targetId: string,
    getNodes: () => Node[],
    getEdges: () => Edge[],
): ConnectionValidity {
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
}

export function createIsValidConnection(
    getNodes: () => Node[],
    getEdges: () => Edge[],
): IsValidConnection {
    return (connection) => {
        if (!connection.source || !connection.target) return false;
        return checkConnectionValidity(connection.source, connection.target, getNodes, getEdges).isValid;
    };
}

export function createOnConnect(
    setEdges: Dispatch<SetStateAction<Edge[]>>,
) {
    return (connection: Connection) =>
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
        );
}

export function createOnConnectStart(
    connectingFrom: MutableRefObject<OnConnectStartParams | null>,
) {
    return (_: unknown, params: OnConnectStartParams) => {
        connectingFrom.current = params;
    };
}

export function createOnConnectEnd(ctx: EdgeHandlerContext) {
    const {
        connectingFrom,
        screenToFlowPosition,
        getIntersectingNodes,
        setEdges,
        setCanvasState,
        getNodes,
        getEdges,
    } = ctx;

    return (event: MouseEvent | TouchEvent) => {
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
            const validity = checkConnectionValidity(sourceNodeId, targetNode.id, getNodes, getEdges);
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
    };
}

export function createOnNodeMouseEnter(
    connectingFrom: MutableRefObject<OnConnectStartParams | null>,
    setCanvasState: Dispatch<SetStateAction<CanvasState>>,
    getNodes: () => Node[],
    getEdges: () => Edge[],
) {
    return (_: React.MouseEvent, node: Node) => {
        if (connectingFrom.current && node.id !== connectingFrom.current.nodeId && node.type === 'relationNode') {
            const sourceId = connectingFrom.current.nodeId;
            if (!sourceId) return;

            const validity = checkConnectionValidity(sourceId, node.id, getNodes, getEdges);
            setCanvasState(prev => ({
                ...prev,
                connectionHover: {
                    nodeId: node.id,
                    isValid: validity.isValid,
                    invalidReason: validity.reason,
                },
            }));
        }
    };
}

export function createOnNodeMouseLeave(
    connectingFrom: MutableRefObject<OnConnectStartParams | null>,
    setCanvasState: Dispatch<SetStateAction<CanvasState>>,
) {
    return () => {
        if (connectingFrom.current) {
            setCanvasState(prev => ({...prev, connectionHover: null}));
        }
    };
}