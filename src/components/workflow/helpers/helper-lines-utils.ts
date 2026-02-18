import { Node } from '@xyflow/react';
import { HelperLine } from '../models';

export interface NodeBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
}

export interface AlignmentMatch {
    axis: 'horizontal' | 'vertical';
    position: number;
    sourceNodeId: string;
    targetNodeId: string;
}

export function getNodeBounds(node: Node): NodeBounds {
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    const left = node.position.x;
    const top = node.position.y;

    return {
        left,
        right: left + width,
        top,
        bottom: top + height,
        centerX: left + width / 2,
        centerY: top + height / 2,
        width,
        height,
    };
}

export function findAlignments(
    draggedNodes: Node[],
    otherNodes: Node[],
    threshold: number = 5
): AlignmentMatch[] {
    const matches: AlignmentMatch[] = [];

    if (draggedNodes.length === 0 || otherNodes.length === 0) {
        return matches;
    }

    const primaryDraggedNode = draggedNodes[0];
    const primaryBounds = getNodeBounds(primaryDraggedNode);

    for (const targetNode of otherNodes) {
        const targetBounds = getNodeBounds(targetNode);

        // Vertical alignments (create horizontal lines)
        const verticalAlignments = [
            { sourcePos: primaryBounds.top, targetPos: targetBounds.top },
            { sourcePos: primaryBounds.centerY, targetPos: targetBounds.centerY },
            { sourcePos: primaryBounds.bottom, targetPos: targetBounds.bottom },
            { sourcePos: primaryBounds.top, targetPos: targetBounds.bottom },
            { sourcePos: primaryBounds.bottom, targetPos: targetBounds.top },
        ];

        for (const alignment of verticalAlignments) {
            const delta = alignment.targetPos - alignment.sourcePos;

            if (Math.abs(delta) <= threshold) {
                matches.push({
                    axis: 'horizontal',
                    position: alignment.targetPos,
                    sourceNodeId: primaryDraggedNode.id,
                    targetNodeId: targetNode.id,
                });
            }
        }

        // Horizontal alignments (create vertical lines)
        const horizontalAlignments = [
            { sourcePos: primaryBounds.left, targetPos: targetBounds.left },
            { sourcePos: primaryBounds.centerX, targetPos: targetBounds.centerX },
            { sourcePos: primaryBounds.right, targetPos: targetBounds.right },
            { sourcePos: primaryBounds.left, targetPos: targetBounds.right },
            { sourcePos: primaryBounds.right, targetPos: targetBounds.left },
        ];

        for (const alignment of horizontalAlignments) {
            const delta = alignment.targetPos - alignment.sourcePos;

            if (Math.abs(delta) <= threshold) {
                matches.push({
                    axis: 'vertical',
                    position: alignment.targetPos,
                    sourceNodeId: primaryDraggedNode.id,
                    targetNodeId: targetNode.id,
                });
            }
        }
    }

    return matches;
}

export function deduplicateLines(matches: AlignmentMatch[]): Map<string, AlignmentMatch[]> {
    const lineMap = new Map<string, AlignmentMatch[]>();

    for (const match of matches) {
        const key = `${match.axis}-${Math.round(match.position)}`;
        const existing = lineMap.get(key) || [];
        existing.push(match);
        lineMap.set(key, existing);
    }

    return lineMap;
}

export function getLineExtent(
    matches: AlignmentMatch[],
    draggedNodes: Node[],
    otherNodes: Node[]
): { start: number; end: number } {
    if (matches.length === 0) {
        return { start: 0, end: 0 };
    }

    const axis = matches[0].axis;
    const involvedNodeIds = new Set<string>();

    for (const match of matches) {
        involvedNodeIds.add(match.sourceNodeId);
        involvedNodeIds.add(match.targetNodeId);
    }

    // Build a map of dragged nodes for quick lookup (these have current positions)
    const draggedNodeMap = new Map(draggedNodes.map(n => [n.id, n]));

    // Get involved nodes, preferring dragged node positions over state positions
    const involvedNodes: Node[] = [];
    for (const id of involvedNodeIds) {
        const draggedNode = draggedNodeMap.get(id);
        if (draggedNode) {
            involvedNodes.push(draggedNode);
        } else {
            const otherNode = otherNodes.find(n => n.id === id);
            if (otherNode) {
                involvedNodes.push(otherNode);
            }
        }
    }

    const bounds = involvedNodes.map(getNodeBounds);

    if (bounds.length === 0) {
        return { start: 0, end: 0 };
    }

    if (axis === 'horizontal') {
        // For horizontal lines, extent is along the X axis
        const start = Math.min(...bounds.map(b => b.left));
        const end = Math.max(...bounds.map(b => b.right));
        return { start, end };
    } else {
        // For vertical lines, extent is along the Y axis
        const start = Math.min(...bounds.map(b => b.top));
        const end = Math.max(...bounds.map(b => b.bottom));
        return { start, end };
    }
}

export function createHelperLines(
    matches: AlignmentMatch[],
    draggedNodes: Node[],
    allNodes: Node[]
): HelperLine[] {
    const lineMap = deduplicateLines(matches);
    const helperLines: HelperLine[] = [];

    for (const [, lineMatches] of lineMap) {
        const { start, end } = getLineExtent(lineMatches, draggedNodes, allNodes);
        const firstMatch = lineMatches[0];

        helperLines.push({
            axis: firstMatch.axis,
            position: firstMatch.position,
            sourceNodeId: firstMatch.sourceNodeId,
            targetNodeIds: [...new Set(lineMatches.map(m => m.targetNodeId))],
            start,
            end,
        });
    }

    return helperLines;
}
