import { useCallback, useRef, useState, MouseEvent as ReactMouseEvent } from 'react';
import { Node, useReactFlow, useStore } from '@xyflow/react';
import { HelperLine } from '../models';
import { findAlignments, createHelperLines, getNodeBounds } from './helper-lines-utils';
import { GRID_SIZE } from "@/components/workflow/flow";

interface ViewportBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

function getViewportBounds(
    viewport: { x: number; y: number; zoom: number },
    width: number,
    height: number
): ViewportBounds {
    return {
        left: -viewport.x / viewport.zoom,
        top: -viewport.y / viewport.zoom,
        right: (width - viewport.x) / viewport.zoom,
        bottom: (height - viewport.y) / viewport.zoom,
    };
}

function isNodeInViewport(node: Node, viewportBounds: ViewportBounds): boolean {
    const bounds = getNodeBounds(node);
    return (
        bounds.right >= viewportBounds.left &&
        bounds.left <= viewportBounds.right &&
        bounds.bottom >= viewportBounds.top &&
        bounds.top <= viewportBounds.bottom
    );
}

export interface UseHelperLinesOptions {
    enabled?: boolean;
    threshold?: number;
    alignableNodeTypes?: string[];
}

type NodeDragHandler = (event: ReactMouseEvent, node: Node, nodes: Node[]) => void;

export interface UseHelperLinesResult {
    helperLines: HelperLine[];
    onNodeDragStart: NodeDragHandler;
    onNodeDrag: NodeDragHandler;
    onNodeDragStop: NodeDragHandler;
}

export function useHelperLines(
    nodes: Node[],
    options: UseHelperLinesOptions = {}
): UseHelperLinesResult {
    const {
        enabled = true,
        threshold = GRID_SIZE / 2,
        alignableNodeTypes = ['relationNode', 'textNode'],
    } = options;

    const [helperLines, setHelperLines] = useState<HelperLine[]>([]);
    const draggingNodeIds = useRef<Set<string>>(new Set());
    const { getViewport } = useReactFlow();
    // Select primitives separately to avoid new object reference causing infinite re-renders
    const width = useStore(state => state.width);
    const height = useStore(state => state.height);

    const onNodeDragStart: NodeDragHandler = useCallback(
        (_event, _node, draggedNodes) => {
            if (!enabled) return;

            draggingNodeIds.current = new Set(draggedNodes.map(n => n.id));
        },
        [enabled]
    );

    const onNodeDrag: NodeDragHandler = useCallback(
        (_event, _node, draggedNodes) => {
            if (!enabled) return;

            // Filter to only alignable node types
            const alignableDraggedNodes = draggedNodes.filter(
                n => alignableNodeTypes.includes(n.type ?? '')
            );

            if (alignableDraggedNodes.length === 0) {
                setHelperLines([]);
                return;
            }

            // Get viewport bounds to filter visible nodes only
            const viewport = getViewport();
            const viewportBounds = getViewportBounds(viewport, width, height);

            // Get other nodes that can be aligned to (only within viewport)
            const otherNodes = nodes.filter(
                n =>
                    !draggingNodeIds.current.has(n.id) &&
                    alignableNodeTypes.includes(n.type ?? '') &&
                    isNodeInViewport(n, viewportBounds)
            );

            if (otherNodes.length === 0) {
                setHelperLines([]);
                return;
            }

            // Find alignments
            const matches = findAlignments(
                alignableDraggedNodes,
                otherNodes,
                threshold
            );

            // Create helper lines from matches
            const lines = createHelperLines(matches, alignableDraggedNodes, otherNodes);
            setHelperLines(lines);
        },
        [enabled, nodes, threshold, alignableNodeTypes, getViewport, width, height]
    );

    const onNodeDragStop: NodeDragHandler = useCallback(
        () => {
            draggingNodeIds.current.clear();
            setHelperLines([]);
        },
        []
    );

    return {
        helperLines,
        onNodeDragStart,
        onNodeDrag,
        onNodeDragStop,
    };
}
