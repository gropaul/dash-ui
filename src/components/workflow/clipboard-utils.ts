import {Node, Edge} from '@xyflow/react';
import {deepClone} from '@/platform/object-utils';

/**
 * Generate a unique ID for a cloned node
 */
export function generateClonedId(originalId: string): string {
    const prefix = originalId.split('-')[0] || 'n';
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Get all selected nodes from the nodes array
 */
export function getSelectedNodes(nodes: Node[]): Node[] {
    return nodes.filter(node => node.selected);
}

/**
 * Get all selected edges from the edges array
 */
export function getSelectedEdges(edges: Edge[]): Edge[] {
    return edges.filter(edge => edge.selected);
}

/**
 * Deep clone nodes for clipboard storage
 */
export function cloneNodesForClipboard(nodes: Node[]): Node[] {
    return nodes.map(node => deepClone(node));
}

/**
 * Deep clone edges for clipboard storage
 */
export function cloneEdgesForClipboard(edges: Edge[]): Edge[] {
    return edges.map(edge => deepClone(edge));
}

/**
 * Clone nodes with new IDs and position offset
 */
export function cloneNodes(
    nodes: Node[],
    idMapping: Map<string, string>,
    offset: { x: number; y: number }
): Node[] {
    return nodes.map(node => {
        const newId = generateClonedId(node.id);
        idMapping.set(node.id, newId);

        // Deep clone the entire node first to avoid any reference issues
        const clonedNode = deepClone(node);

        return {
            ...clonedNode,
            id: newId,
            position: {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
            },
            selected: true,
        };
    });
}

/**
 * Clone edges that connect copied nodes, remapping their IDs.
 * Only clones edges where BOTH source and target are in the copied nodes.
 */
export function cloneEdges(
    edges: Edge[],
    copiedNodeIds: Set<string>,
    idMapping: Map<string, string>
): Edge[] {
    return edges
        .filter(edge => copiedNodeIds.has(edge.source) && copiedNodeIds.has(edge.target))
        .map(edge => {
            // Deep clone the entire edge first to avoid any reference issues
            const clonedEdge = deepClone(edge);

            return {
                ...clonedEdge,
                id: `e-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                source: idMapping.get(edge.source)!,
                target: idMapping.get(edge.target)!,
                selected: false,
            };
        });
}

/**
 * Filter edges to only those fully contained within the given node IDs
 * (both source and target must be in the set)
 */
export function getInternalEdges(edges: Edge[], nodeIds: Set<string>): Edge[] {
    return edges.filter(
        edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
}
