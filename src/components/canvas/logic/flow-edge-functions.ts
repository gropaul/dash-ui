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
import {CanvasState, DEFAULT_NODE_SIZE} from "@/components/canvas/logic/models";
import {getMacroName} from "@/state/relations/sql/table-macros";
import {injectNodeRef} from "@/components/canvas/logic/ref-detection";
import {RelationState} from "@/model/relation-state";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {useRelationsState} from "@/state/relations.state";
import {addRelationForCanvas} from "@/components/canvas/logic/canvas-relations";

export interface ConnectionValidity {
    isValid: boolean;
    reason?: 'cycle' | 'duplicate';
}

export interface EdgeHandlerContext {
    canvasId: string;
    getNodes: () => Node[];
    getEdges: () => Edge[];
    setNodes: Dispatch<SetStateAction<Node[]>>;
    setEdges: Dispatch<SetStateAction<Edge[]>>;
    setCanvasState: Dispatch<SetStateAction<CanvasState>>;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    getIntersectingNodes: (rect: { x: number; y: number; width: number; height: number }) => Node[];
    connectingFrom: MutableRefObject<OnConnectStartParams | null>;
}

/**
 * Inject a node macro reference into the target node's SQL when an edge is created via drag.
 */
function injectSqlOnConnect(
    sourceNodeId: string,
    targetNodeId: string,
    getNodes: () => Node[],
): void {
    const nodes = getNodes();
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) return;
    if (sourceNode.type !== 'relationNode' || targetNode.type !== 'relationNode') return;

    const sourceRelationId = (sourceNode.data as {relationId?: string}).relationId;
    const targetRelationId = (targetNode.data as {relationId?: string}).relationId;
    if (!sourceRelationId || !targetRelationId) return;

    const storeState = useRelationsState.getState();
    const sourceRelation = storeState.relations[sourceRelationId];
    const targetRelation = storeState.relations[targetRelationId];
    if (!sourceRelation || !targetRelation) return;

    const displayName = sourceRelation.viewState.displayName;
    if (!displayName) return;

    const macroName = getMacroName(displayName);
    const currentSql = targetRelation.query.baseQuery ?? '';
    const newSql = injectNodeRef(currentSql, macroName);

    if (newSql === currentSql) return;

    storeState.updateRelation({
        ...targetRelation,
        query: {...targetRelation.query, baseQuery: newSql},
    });
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

export function createOnConnect(ctx: EdgeHandlerContext) {
    const {setEdges, setNodes, getNodes} = ctx;
    return (connection: Connection) => {
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
        // Inject SQL into the target node
        if (connection.source && connection.target) {
            injectSqlOnConnect(connection.source, connection.target, getNodes);
        }
    };
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
        setNodes,
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
                // Inject SQL into the target node
                injectSqlOnConnect(sourceNodeId, targetNode.id, getNodes);
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

        // Dropped on empty canvas — create a new relation node with a ref to the source
        const sourceNode = getNodes().find(n => n.id === sourceNodeId);
        if (sourceNode && sourceNode.type === 'relationNode') {
            const sourceRelationId = (sourceNode.data as {relationId?: string}).relationId;
            const sourceRelation = sourceRelationId ? useRelationsState.getState().relations[sourceRelationId] : undefined;
            const displayName = sourceRelation?.viewState?.displayName;
            if (displayName) {
                const macroName = getMacroName(displayName);
                const initialData = RelationActions.create({showCode: true});
                const newSql = `SELECT * FROM ${macroName}()`;
                initialData.query.baseQuery = newSql;
                initialData.query.activeBaseQuery = newSql;

                // Register new relation in state (added as a sibling of the canvas in the editor tree)
                addRelationForCanvas(ctx.canvasId, initialData);

                const newNodeId = `n-${Date.now()}`;

                // Position new node so cursor is at center of the near edge
                const sourceW = sourceNode.width ?? DEFAULT_NODE_SIZE.width;
                const sourceH = sourceNode.height ?? DEFAULT_NODE_SIZE.height;
                const sourceCenterX = sourceNode.position.x + sourceW / 2;
                const sourceCenterY = sourceNode.position.y + sourceH / 2;
                const dx = dropPosition.x - sourceCenterX;
                const dy = dropPosition.y - sourceCenterY;

                let newX: number;
                let newY: number;

                if (Math.abs(dx) >= Math.abs(dy)) {
                    // Horizontal: cursor at center of left/right edge
                    newY = dropPosition.y - DEFAULT_NODE_SIZE.height / 2;
                    newX = dx >= 0
                        ? dropPosition.x
                        : dropPosition.x - DEFAULT_NODE_SIZE.width;
                } else {
                    // Vertical: cursor at center of top/bottom edge
                    newX = dropPosition.x - DEFAULT_NODE_SIZE.width / 2;
                    newY = dy >= 0
                        ? dropPosition.y
                        : dropPosition.y - DEFAULT_NODE_SIZE.height;
                }

                const newNode: Node = {
                    id: newNodeId,
                    type: 'relationNode',
                    position: {x: newX, y: newY},
                    width: DEFAULT_NODE_SIZE.width,
                    height: DEFAULT_NODE_SIZE.height,
                    selected: true,
                    data: {relationId: initialData.id},
                };

                setNodes((nds) =>
                    [...nds.map((node) => ({...node, selected: false})), newNode]
                );
            }
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