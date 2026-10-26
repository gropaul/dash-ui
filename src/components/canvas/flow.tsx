'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Background,
    ConnectionMode,
    Controls,
    Connection,
    Node,
    NodeTypes,
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
import {useSurfaces} from "@/state/workspace/surfaces.state";
import {useWorkspace} from "@/state/workspace/workspace.state";
import {queryByName} from "@/state/workspace/file-references";
import {renameRefCalls} from "@/platform/sql-refs";
import {useRelationLinks} from "@/components/page-editor/use-relation-links";
import {RenameRelationContext} from "@/components/relation/common/rename-relation-context";
import {askForName} from "@/components/workspace/name-dialog";
import {blockBody, blockNameOf, blockOf, isRelationNode} from "@/components/canvas/logic/canvas-file";
import {RelationFullscreenDialog} from "@/components/canvas/nodes/relation/relation-fullscreen";

// A block's name is what other blocks write in refs.<name>(), so it must be one as it stands.
const BLOCK_NAME = /^[a-z_][a-z0-9_]*$/;

export interface FlowProps {
    /** The canvas file's path. */
    canvasId: string;
    openFullscreen: (nodeId: string) => void;
}


export type NodeType = 'relationNode' | 'chartNode' | 'textNode' | 'freeDrawNode';

const nodeTypes: Record<NodeType, NodeTypes[string]> = {
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
    // True while the viewport is being panned/zoomed. Disables node pointer events (via the
    // `canvas-panning` class) so an in-progress pan is not interrupted when the cursor crosses a node.
    const [isPanning, setIsPanning] = useState(false);
    const {screenToFlowPosition, getIntersectingNodes, getNodes, getEdges} = useReactFlow();
    const connectingFrom = useRef<OnConnectStartParams | null>(null);
    const {resolvedTheme} = useTheme();
    // Query nodes reading another re-run once it ran or its pick changed, as blocks of a page do.
    useRelationLinks(canvasId);

    const runSelectedNode = useCallback(() => {
        const selected = nodes.find(n => n.selected && isRelationNode(n));
        if (!selected) return;
        const relationData = useSurfaces.getState().relations[`${canvasId}#${blockNameOf(selected) ?? selected.id}`];
        if (!relationData) return;
        const updateRelation = (newRelation: RelationState) => {
            useSurfaces.getState().set(newRelation);
        };
        const actions = getRelationActions({mode: 'embedded', relationState: relationData, updateRelation});
        actions.updateRelationDataWithBaseQuery(relationData.query.baseQuery);
    }, [nodes, canvasId]);

    // Renames a query node's block and the refs to it in the other query nodes.
    const renameBlock = useCallback((relation: RelationState) => askForName({
        title: 'Rename block',
        initial: relation.viewState.displayName,
        submitLabel: 'Rename',
        validate: name => !BLOCK_NAME.test(name) ? 'A block name is a lowercase SQL identifier, e.g. sales_by_region.'
            : name !== relation.viewState.displayName && nodes.some(n => isRelationNode(n) && blockNameOf(n) === name)
                ? `Another block on the canvas is named ${name}.`
                : queryByName(useWorkspace.getState().files, name) ? `A query is named ${name}.` : undefined,
        onSubmit: name => {
            const from = relation.viewState.displayName.toLowerCase();
            setNodes(nds => nds.map(node => {
                if (!isRelationNode(node)) return node;
                const block = blockOf(node);
                const sql = renameRefCalls(block.sql, from, name);
                const newName = block.name?.toLowerCase() === from ? name : block.name ?? '';
                if (sql === block.sql && newName === block.name) return node;
                return {...node, data: {...node.data, body: blockBody(newName, block.header, sql)}};
            }));
        },
    }), [nodes, setNodes]);

    // The arrows into a query node move while it runs.
    const running = useSurfaces(s => Object.values(s.relations)
        .filter(r => r.id.startsWith(`${canvasId}#`) && r.executionState.state === 'running')
        .map(r => r.viewState.displayName.toLowerCase()).sort().join(','));
    const animatedEdges = useMemo(() => {
        if (!running) return edges;
        const names = new Set(running.split(','));
        const runningIds = new Set(nodes.filter(n => isRelationNode(n) && names.has(blockNameOf(n)?.toLowerCase() ?? '')).map(n => n.id));
        return edges.map(e => runningIds.has(e.target) ? {...e, data: {...e.data, animationState: 'executing'}} : e);
    }, [edges, nodes, running]);

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

    const edgeHandlerCtx: EdgeHandlerContext = useMemo(() => ({
        canvasId,
        getNodes,
        getEdges,
        setNodes,
        setEdges,
        setCanvasState,
        screenToFlowPosition,
        getIntersectingNodes,
        connectingFrom,
    }), [canvasId, getNodes, getEdges, setNodes, setEdges, screenToFlowPosition, getIntersectingNodes]);

    const isValidConnection = useMemo(
        () => createIsValidConnection(getNodes, getEdges),
        [getNodes, getEdges],
    );

    // The handlers are built when called: they hold the `connectingFrom` ref, which render must not touch.
    const onConnect = useCallback(
        (connection: Connection) => createOnConnect(edgeHandlerCtx)(connection),
        [edgeHandlerCtx],
    );

    const onConnectStart = useCallback(
        (event: unknown, params: OnConnectStartParams) => createOnConnectStart(connectingFrom)(event, params),
        [],
    );

    const onConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent) => createOnConnectEnd(edgeHandlerCtx)(event),
        [edgeHandlerCtx],
    );

    const onNodeMouseEnter = useCallback(
        (event: React.MouseEvent, node: Node) => createOnNodeMouseEnter(connectingFrom, setCanvasState, getNodes, getEdges)(event, node),
        [getNodes, getEdges],
    );

    const onNodeMouseLeave = useCallback(
        () => createOnNodeMouseLeave(connectingFrom, setCanvasState)(),
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
            <RenameRelationContext.Provider value={renameBlock}>
            <div
                className={isPanning ? 'canvas-panning' : undefined}
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
                edges={animatedEdges}
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
                fitView={!viewport}
                fitViewOptions={{padding: 0.1, maxZoom: 1}}
                onViewportChange={onViewportChange}
                onMoveStart={() => setIsPanning(true)}
                onMoveEnd={() => setIsPanning(false)}
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
            <RelationFullscreenDialog nodes={nodes}/>
            </RenameRelationContext.Provider>
        </CanvasProvider>
    );
}
