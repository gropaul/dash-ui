import {Position} from '@xyflow/react';

const EDGE_PADDING = 2;

function getNodeCenter(node: any) {
    return {
        x: node.internals.positionAbsolute.x + node.measured.width / 2,
        y: node.internals.positionAbsolute.y + node.measured.height / 2,
    };
}

function getNodeBounds(node: any) {
    return {
        x: node.internals.positionAbsolute.x,
        y: node.internals.positionAbsolute.y,
        width: node.measured.width,
        height: node.measured.height,
    };
}

// Get the intersection point of a line from center to target on the node's border
function getNodeIntersection(node: any, targetPoint: {x: number; y: number}, snapToCenter: boolean = false) {
    const bounds = getNodeBounds(node);
    const center = getNodeCenter(node);

    const w = bounds.width / 2;
    const h = bounds.height / 2;

    const dx = targetPoint.x - center.x;
    const dy = targetPoint.y - center.y;

    // Handle edge case where nodes are at the same position
    if (dx === 0 && dy === 0) {
        return {x: center.x, y: bounds.y, position: Position.Top};
    }

    const slope = Math.abs(dy / dx);
    const nodeSlope = h / w;

    let x: number, y: number;
    let position: Position;

    if (slope <= nodeSlope) {
        // Intersection on left or right edge
        const sign = dx >= 0 ? 1 : -1;
        x = center.x + sign * (w + EDGE_PADDING);
        y = snapToCenter ? center.y : center.y + (sign * w * dy) / dx;
        position = sign > 0 ? Position.Right : Position.Left;
    } else {
        // Intersection on top or bottom edge
        const sign = dy >= 0 ? 1 : -1;
        x = snapToCenter ? center.x : center.x + (sign * h * dx) / dy;
        y = center.y + sign * (h + EDGE_PADDING);
        position = sign > 0 ? Position.Bottom : Position.Top;
    }

    return {x, y, position};
}

export interface EdgeParams {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    sourcePos: Position;
    targetPos: Position;
}

// Returns the parameters for a floating edge between two nodes
export function getEdgeParams(
    source: any,
    target: any,
    snapToCenter: boolean = false
): EdgeParams {
    const sourceCenter = getNodeCenter(source);
    const targetCenter = getNodeCenter(target);

    const sourceIntersection = getNodeIntersection(source, targetCenter, snapToCenter);
    const targetIntersection = getNodeIntersection(target, sourceCenter, snapToCenter);

    return {
        sx: sourceIntersection.x,
        sy: sourceIntersection.y,
        tx: targetIntersection.x,
        ty: targetIntersection.y,
        sourcePos: sourceIntersection.position,
        targetPos: targetIntersection.position,
    };
}
