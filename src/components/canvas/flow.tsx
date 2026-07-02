'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Background,
    ConnectionMode,
    Controls,
    Node,
    OnConnectStartParams,
    ReactFlow,
    SelectionMode,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {RelationNode} from "@/components/canvas/nodes/relation-node";
import {FreeDrawNode} from "@/components/canvas/nodes/free-draw-node";
import {TextNode} from "@/components/canvas/nodes/text-node";
import FloatingEdge from "@/components/canvas/edge/floating-edge";
import {FlowPalette} from "@/components/canvas/flow-palette";
import {
    createIsValidConnection,
    createOnConnect,
    createOnConnectEnd,
    createOnConnectStart,
    createOnNodeMouseEnter,
    createOnNodeMouseLeave,
    EdgeHandlerContext,
} from "@/components/canvas/logic/flow-edge-functions";
import {
    getCursorStyle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    PointerHandlerContext,
} from "@/components/canvas/logic/flow-pointer-functions";

import './flow-theme.css';
import {CanvasState, CanvasStateFreeDraw, GRID_SIZE, INITIAL_CANVAS_STATE} from "@/components/canvas/logic/models";
import {NodePreview} from "@/components/canvas/previews/node-preview";
import {FreeDrawPreview} from "@/components/canvas/previews/free-draw-preview";
import {useTheme} from "next-themes";
import {useFlowShortcuts} from "@/hooks/use-flow-shortcuts";
import {useHelperLines} from "@/components/canvas/helpers/use-helper-lines";
import {HelperLines} from "@/components/canvas/helpers/helper-lines";
import {useUndoableFlow} from "@/hooks/use-undoable-flow";
import {CanvasProvider} from "@/components/canvas/canvas-context";
import {RelationState} from "@/model/relation-state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {useRelationsState} from "@/state/relations.state";
import {getRelationDependencies} from "@/state/relations/relation-dependencies";
import {useRelationDeleteDialog} from "@/components/workbench/relation-delete-dialog";
import {findPathById} from "@/components/basics/files/tree-utils";

export interface FlowProps {
    canvasId: string;
    openFullscreen: (nodeId: string) => void;
}


export type NodeType = 'relationNode' | 'chartNode' | 'textNode' | 'freeDrawNode';

const nodeTypes: { [key in NodeType]: React.FC<any> } = {
    relationNode: RelationNode,
    chartNode: RelationNode, // Template - uses RelationNode for now
    textNode: TextNode,
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

export function Flow({canvasId, openFullscreen}: FlowProps) {
    const {
        nodes,
        edges,
        viewport,
        setNodes,
        setEdges,
        onNodesChange,
        onEdgesChange,
        onViewportChange,
        undo,
        redo,
    } = useUndoableFlow(canvasId);

    const [canvasState, setCanvasState] = useState<CanvasState>(INITIAL_CANVAS_STATE);
    const {screenToFlowPosition, getIntersectingNodes, getNodes, getEdges} = useReactFlow();
    const connectingFrom = useRef<OnConnectStartParams | null>(null);
    const {resolvedTheme} = useTheme();

    const runSelectedNode = useCallback(() => {
        const selected = nodes.find(n => n.selected && n.type === 'relationNode');
        if (!selected) return;
        const relationId = (selected.data as {relationId?: string}).relationId;
        if (!relationId) return;
        const relationData = useRelationsState.getState().relations[relationId];
        if (!relationData) return;
        const updateRelation = (newRelation: RelationState) => {
            useRelationsState.getState().updateRelation(newRelation);
        };
        const actions = getRelationActions({mode: 'embedded', relationState: relationData, updateRelation});
        actions.updateRelationDataWithBaseQuery(relationData.query.baseQuery);
    }, [nodes]);

    useFlowShortcuts({
        canvasId,
        nodes,
        edges,
        setNodes,
        setEdges,
        onUndo: undo,
        onRedo: redo,
    });

    const {
        helperLines,
        onNodeDragStart,
        onNodeDrag,
        onNodeDragStop,
    } = useHelperLines(nodes, {
        enabled: canvasState.selectedTool === 'pointer',
        alignableNodeTypes: ['relationNode', 'textNode'],
    });

    const edgeHandlerCtx: EdgeHandlerContext = {
        canvasId,
        getNodes,
        getEdges,
        setNodes,
        setEdges,
        setCanvasState,
        screenToFlowPosition,
        getIntersectingNodes,
        connectingFrom,
    };

    const isValidConnection = useCallback(
        createIsValidConnection(getNodes, getEdges),
        [getNodes, getEdges],
    );

    const onConnect = useCallback(
        createOnConnect(edgeHandlerCtx),
        [setEdges, setNodes, getNodes],
    );

    const onConnectStart = useCallback(
        createOnConnectStart(connectingFrom),
        [],
    );

    const onConnectEnd = useCallback(
        createOnConnectEnd(edgeHandlerCtx),
        [screenToFlowPosition, getIntersectingNodes, setEdges, getNodes, getEdges],
    );

    const onNodeMouseEnter = useCallback(
        createOnNodeMouseEnter(connectingFrom, setCanvasState, getNodes, getEdges),
        [getNodes, getEdges],
    );

    const onNodeMouseLeave = useCallback(
        createOnNodeMouseLeave(connectingFrom, setCanvasState),
        [],
    );

    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
        const deletedRelationNodes = deletedNodes
            .filter(n => n.type === 'relationNode')
            .map(n => ({nodeId: n.id, relationId: (n.data as {relationId?: string}).relationId}))
            .filter((entry): entry is {nodeId: string; relationId: string} => !!entry.relationId);

        if (deletedRelationNodes.length === 0) return;

        const excludeNodeIds = new Set(deletedRelationNodes.map(n => n.nodeId));

        // For each deleted relation node, check if it's still referenced elsewhere
        for (const {relationId} of deletedRelationNodes) {
            const deps = getRelationDependencies(relationId, {canvasNodeIds: excludeNodeIds});
            if (deps.isOrphan) {
                const relation = useRelationsState.getState().relations[relationId];
                if (relation) {
                    const editorPath = findPathById(useRelationsState.getState().editorElements, relationId);
                    useRelationDeleteDialog.getState().openForOrphanDelete(
                        relationId,
                        relation.viewState.displayName,
                        () => {
                            if (editorPath) {
                                useRelationsState.getState().deleteEntity('relations', relationId, editorPath);
                            }
                        },
                    );
                }
            }
        }
    }, []);

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
        canvasId,
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
                setCanvasState(prev => ({selectedTool: 'pointer', drawSettings: prev.drawSettings}));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <CanvasProvider canvasId={canvasId} setNodes={setNodes} setEdges={setEdges} getNodes={getNodes} getEdges={getEdges} openFullscreen={openFullscreen}>
            <div
                style={{width: '100%', height: '100%'}}
                onKeyDownCapture={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.stopPropagation();
                        e.preventDefault();
                        runSelectedNode();
                    }
                }}
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
                onNodesDelete={onNodesDelete}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
                defaultViewport={viewport}
                onViewportChange={onViewportChange}
                snapToGrid={canvasState.selectedTool !== 'free-draw'}
                snapGrid={[GRID_SIZE, GRID_SIZE]}
                panOnScroll={true}
                panOnScrollSpeed={1.5}
                panOnDrag={canvasState.selectedTool === 'drag-canvas' ? true : [1]}
                style={{cursor: cursorStyle}}
                zoomOnScroll={false}
                selectionOnDrag={canvasState.selectedTool === 'pointer'}
                elementsSelectable={canvasState.selectedTool === 'pointer'}
                selectionMode={SelectionMode.Partial}
                connectionRadius={32}
                edgesFocusable={true}
                defaultEdgeOptions={{interactionWidth: 20}}
                deleteKeyCode={['Delete', 'Backspace']}
                panActivationKeyCode={null}
            >
                <Background
                    id={canvasId}
                    offset={GRID_SIZE}
                    gap={GRID_SIZE}
                />

                <Controls/>
                <HelperLines helperLines={helperLines}/>
                <NodePreview canvasState={canvasState}/>
                <FreeDrawPreview
                    currentStroke={canvasState.selectedTool === 'free-draw' ? (canvasState as CanvasStateFreeDraw).currentStroke : undefined}
                />
                <FlowPalette canvasState={canvasState} setCanvasState={setCanvasState}/>
                </ReactFlow>
            </div>
        </CanvasProvider>
    );
}
