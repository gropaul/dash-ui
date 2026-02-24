'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Background,
    ConnectionMode,
    Controls,
    OnConnectStartParams,
    ReactFlow,
    SelectionMode,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {RelationNode} from "@/components/workflow/nodes/relation-node";
import {FreeDrawNode} from "@/components/workflow/nodes/free-draw-node";
import {TextNode} from "@/components/workflow/nodes/text-node";
import FloatingEdge from "@/components/workflow/edge/floating-edge";
import {FlowPalette} from "@/components/workflow/flow-palette";
import {
    createIsValidConnection,
    createOnConnect,
    createOnConnectEnd,
    createOnConnectStart,
    createOnNodeMouseEnter,
    createOnNodeMouseLeave,
    EdgeHandlerContext,
} from "@/components/workflow/flow-edge-functions";
import {
    getCursorStyle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    PointerHandlerContext,
} from "@/components/workflow/flow-pointer-functions";

import './flow-theme.css';
import {CanvasState, CanvasStateFreeDraw, INITIAL_CANVAS_STATE} from "@/components/workflow/models";
import {NodePreview} from "@/components/workflow/previews/node-preview";
import {FreeDrawPreview} from "@/components/workflow/previews/free-draw-preview";
import {useTheme} from "next-themes";
import {useFlowShortcuts} from "@/hooks/use-flow-shortcuts";
import {useHelperLines} from "@/components/workflow/helpers/use-helper-lines";
import {HelperLines} from "@/components/workflow/helpers/helper-lines";
import {useUndoableFlow} from "@/hooks/use-undoable-flow";
import {WorkflowProvider} from "@/components/workflow/workflow-context";

export interface FlowProps {
    workflowId: string;
}

export const GRID_SIZE = 20;

export const DEFAULT_CODE_VIEW_HEIGHT = 192; // Default fallback height for code view
export const HEADER_HEIGHT = 40; // Height of the node header (8px padding top + 28px icon + 8px padding bottom + 1px border)


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

export function Flow({workflowId}: FlowProps) {
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
    } = useUndoableFlow(workflowId);

    const [canvasState, setCanvasState] = useState<CanvasState>(INITIAL_CANVAS_STATE);
    const {screenToFlowPosition, getIntersectingNodes, getNodes, getEdges} = useReactFlow();
    const connectingFrom = useRef<OnConnectStartParams | null>(null);
    const {resolvedTheme} = useTheme();

    useFlowShortcuts({
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
        getNodes,
        getEdges,
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
        createOnConnect(setEdges),
        [setEdges],
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
                setCanvasState(prev => ({selectedTool: 'pointer', drawSettings: prev.drawSettings}));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <WorkflowProvider setNodes={setNodes} setEdges={setEdges}>
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
                snapToGrid={true}
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
            >
                <Background
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
        </WorkflowProvider>
    );
}
