import {Node} from '@xyflow/react';
import {CanvasState, CanvasStateNodeCreation, CanvasStateFreeDraw, Stroke, StrokePoint} from "@/components/workflow/models";
import {NodeTemplate, Position} from "@/components/workflow/flow";
import {FreeDrawNodeData} from "@/components/workflow/nodes/free-draw-node";

export interface PointerHandlerContext {
    canvasState: CanvasState;
    setCanvasState: (state: CanvasState) => void;
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

function getRelativePosition(event: React.PointerEvent<HTMLDivElement>): Position {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

export function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
    ctx: PointerHandlerContext
) {
    if (ctx.canvasState.selectedTool === 'free-draw') {
        const freeDrawState = ctx.canvasState as CanvasStateFreeDraw;
        if (!freeDrawState.currentStroke) return;

        event.preventDefault();
        const flowPos = ctx.screenToFlowPosition({x: event.clientX, y: event.clientY});
        const pressure = event.pressure || 0.5;

        ctx.setCanvasState({
            ...freeDrawState,
            currentStroke: {
                ...freeDrawState.currentStroke,
                points: [...freeDrawState.currentStroke.points, [flowPos.x, flowPos.y, pressure]],
            },
        });
        return;
    }

    if (ctx.canvasState.selectedTool !== 'create-node') return;

    event.preventDefault();
    const currentPos = getRelativePosition(event);

    if (ctx.canvasState.sizing) {
        ctx.setCanvasState({
            ...ctx.canvasState,
            previewMousePosition: currentPos,
            sizing: {
                ...ctx.canvasState.sizing,
                endPosition: currentPos,
            },
        });
    } else {
        ctx.setCanvasState({
            ...ctx.canvasState,
            previewMousePosition: currentPos,
        });
    }
}

export function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    ctx: PointerHandlerContext
) {
    if (ctx.canvasState.selectedTool === 'free-draw') {
        event.preventDefault();
        const flowPos = ctx.screenToFlowPosition({x: event.clientX, y: event.clientY});
        const pressure = event.pressure || 0.5;

        const newStroke: Stroke = {
            id: `stroke-${Date.now()}`,
            points: [[flowPos.x, flowPos.y, pressure]],
            color: '#000000',
            size: 8,
        };

        ctx.setCanvasState({
            selectedTool: 'free-draw',
            currentStroke: newStroke,
        });
        return;
    }

    if (ctx.canvasState.selectedTool !== 'create-node') return;
    const nodeCreationState = ctx.canvasState as CanvasStateNodeCreation;
    if (!nodeCreationState.previewMousePosition) return;

    event.preventDefault();
    const position = getRelativePosition(event);

    ctx.setCanvasState({
        ...nodeCreationState,
        sizing: {
            startPosition: position,
            endPosition: position,
        },
    });
}

function getBounds(points: StrokePoint[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    return {minX, minY, maxX, maxY};
}

function createFreeDrawNode(ctx: PointerHandlerContext, stroke: Stroke) {
    const bounds = getBounds(stroke.points);
    const padding = stroke.size + 4;

    // Normalize points relative to the node's position
    const normalizedPoints: StrokePoint[] = stroke.points.map(([x, y, pressure]) => [
        x - bounds.minX,
        y - bounds.minY,
        pressure,
    ]);

    const nodeData: FreeDrawNodeData = {
        points: normalizedPoints,
        color: stroke.color,
        strokeSize: stroke.size,
    };

    const newNode: Node = {
        id: `fd-${Date.now()}`,
        type: 'freeDrawNode',
        position: {x: bounds.minX - padding, y: bounds.minY - padding},
        data: nodeData as unknown as Record<string, unknown>,
        selected: true,
    };

    ctx.setNodes((nds) =>
        nds.map((node) => ({...node, selected: false}))
    );
    ctx.setNodes((nds) => nds.concat(newNode));
}

export function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>,
    ctx: PointerHandlerContext
) {
    if (ctx.canvasState.selectedTool === 'free-draw') {
        const freeDrawState = ctx.canvasState as CanvasStateFreeDraw;
        if (!freeDrawState.currentStroke) return;

        event.preventDefault();

        // Only save stroke if it has more than 1 point
        if (freeDrawState.currentStroke.points.length > 1) {
            createFreeDrawNode(ctx, freeDrawState.currentStroke);
        }

        ctx.setCanvasState({
            selectedTool: 'free-draw',
            currentStroke: undefined,
        });
        return;
    }

    if (ctx.canvasState.selectedTool !== 'create-node') return;
    const nodeCreationState = ctx.canvasState as CanvasStateNodeCreation;
    if (!nodeCreationState.sizing) return;

    event.preventDefault();

    const {startPosition: start, endPosition: end} = nodeCreationState.sizing;

    const dragDistance = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    // If drag is minimal (< 5px), use default size, otherwise use calculated size
    const useDragSize = dragDistance >= 5;
    const nodeScreenSize = useDragSize ?
        {
            width: Math.max(Math.abs(end.x - start.x), 100),
            height: Math.max(Math.abs(end.y - start.y), 100)
        } : nodeCreationState.nodeAdded.size;

    // Get top-left corner position (in case user dragged backwards)
    const topLeftX = Math.min(start.x, end.x);
    const topLeftY = Math.min(start.y, end.y);

    const rect = event.currentTarget.getBoundingClientRect();
    const screenTopLeft = {
        x: rect.left + topLeftX,
        y: rect.top + topLeftY,
    };

    const flowTopLeft = ctx.screenToFlowPosition(screenTopLeft);

    const flowLowerRight = ctx.screenToFlowPosition({
        x: screenTopLeft.x + nodeScreenSize.width,
        y: screenTopLeft.y + nodeScreenSize.height,
    });

    const flowNodeSize = {
        width: flowLowerRight.x - flowTopLeft.x,
        height: flowLowerRight.y - flowTopLeft.y,
    };

    // if there is no drag, the node size is already canvas size
    let copy = {...nodeCreationState.nodeAdded};
    if (useDragSize) {
        copy['size'] = flowNodeSize;
    }

    createNode(ctx, copy, flowTopLeft);

    ctx.setCanvasState({
        selectedTool: 'pointer',
    });
}

function createNode(ctx: PointerHandlerContext, template: NodeTemplate, position: Position) {
    const newNode: Node = {
        id: `n${ctx.nodes.length + 1}`,
        type: template.type,
        position,
        width: template.size.width,
        height: template.size.height,
        selected: true,
        data: {},
    };
    // deselect all other nodes
    ctx.setNodes((nds) =>
        nds.map((node) => ({...node, selected: false}))
    );
    ctx.setNodes((nds) => nds.concat(newNode));
}

export function getCursorStyle(canvasState: CanvasState): string {
    switch (canvasState.selectedTool) {
        case 'pointer':
            return 'default';
        case 'drag-canvas':
            return 'grab';
        case 'create-node':
            return 'crosshair';
        case 'free-draw':
            return 'crosshair';
    }
}