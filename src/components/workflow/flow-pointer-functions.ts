import {Node} from '@xyflow/react';
import {CanvasState, CanvasStateNodeCreation} from "@/components/workflow/models";
import {NodeTemplate, Position} from "@/components/workflow/flow";

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

export function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>,
    ctx: PointerHandlerContext
) {
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
    }
}