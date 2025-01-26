import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";

export interface TreeNode<C = TreeNode<any>, T = string> {
    id: string;
    // also serves as unique key
    name: string;
    type: T;
    // is undefined if not loaded, null if no children, otherwise an array of children
    children?: C[] | null;    // todo: this should maybe be a dictionary for faster lookup
    payload?: any;
    expanded?: boolean;  // whether the node is expanded or not
    selected?: boolean;
}

export type TreeActionType = 'update' | 'remove' | 'add' | 'partial_update';
export type TreeAction = TreeActionUpdate | TreeActionRemove | TreeActionAdd | TreeActionPartialUpdate;

export interface TreeActionBase {
    type: TreeActionType;
    id_path: string[];
}

export interface TreeActionAdd extends TreeActionBase {
    type: 'add';
    node: TreeNode;
}

export interface TreeActionUpdate extends TreeActionBase {
    type: 'update';
    node: TreeNode;
}

export interface TreeActionPartialUpdate extends TreeActionBase {
    type: 'partial_update';
    node: DeepPartial<TreeNode>;
}

export interface TreeActionRemove extends TreeActionBase {
    type: 'remove';
}

export function copyAndApplyTreeActions(trees: TreeNode[], action: TreeAction[]): TreeNode[] {
    const copy = [...trees];
    return applyTreeActions(copy, action);
}

export function applyTreeActions(trees: TreeNode[], actions: TreeAction[]): TreeNode[] {
    return actions.reduce((acc, action) => applyTreeAction(acc, action), trees);
}

export function applyTreeAction(trees: TreeNode[], action: TreeAction): TreeNode[] {
    switch (action.type) {
        case 'add':
            return addNode(trees, action.id_path, action.node!);
        case 'update':
            return updateNode(trees, action.id_path, action.node!);
        case 'partial_update':
            return partialUpdateNode(trees, action.id_path, action.node!);
        case 'remove':
            return removeNode(trees, action.id_path);
    }
}

export function findNodeInTrees(trees: TreeNode[], id_path: string[]): TreeNode | undefined {
    // If there's no path, we cannot find anything
    if (id_path.length === 0) {
        return undefined;
    }

    const [currentId, ...rest] = id_path;

    for (const node of trees) {
        // Match the first segment of the path
        if (node.id === currentId) {
            // If nothing left in the path, this is our node
            if (rest.length === 0) {
                return node;
            }
            // Otherwise, look for a deeper match in children
            if (node.children) {
                return findNodeInTrees(node.children, rest);
            }
            // If no children to traverse, no match found
            return undefined;
        }
    }

    // If we exhaust the array without finding a match, return undefined
    return undefined;
}

export function IterateAll(trees: TreeNode[], callback: (node: TreeNode, id_path: string[]) => void) {
    function iterate(node: TreeNode, id_path: string[]) {
        callback(node, id_path);
        if (node.children) {
            node.children.forEach((child) => iterate(child, [...id_path, child.id]));
        }
    }

    trees.forEach((node) => iterate(node, [node.id]));
}


export function findNodeParentInTrees(trees: TreeNode[], id_path: string[]): TreeNode | undefined {
    if (id_path.length === 0) {
        return undefined;
    }
    const parent_id = id_path.slice(0, -1);
    return findNodeInTrees(trees, parent_id);
}

export function updateNode(
    nodes: TreeNode[],
    id_path: string[],
    newNode: TreeNode
): TreeNode[] {
    return genericUpdateNode(nodes, id_path, () => newNode);
}

export function partialUpdateNode(nodes: TreeNode[], id_path: string[], partialNode: DeepPartial<TreeNode>): TreeNode[] {

    function partialUpdateNode(current: TreeNode): TreeNode {
        const currentClone = deepClone(current);
        safeDeepUpdate(currentClone, partialNode);
        return currentClone;
    }

    return genericUpdateNode(nodes, id_path, partialUpdateNode);
}

export function genericUpdateNode(
    nodes: TreeNode[],
    id_path: string[],
    getNewNode: (currentNode: TreeNode) => TreeNode
): TreeNode[] {
    // If there's no path, we cannot update anything, so just return the original array.
    if (id_path.length === 0) {
        return nodes;
    }

    return nodes.map((node) => {
        // If this node matches the first id in our path, we either:
        // - Replace it if it's the final ID in the path.
        // - Recursively update its children if there are more IDs in the path.
        if (node.id === id_path[0]) {
            // If this is the last ID in the path, replace the node entirely.
            if (id_path.length === 1) {
                return getNewNode(node);
            }

            // If we have more IDs in the path, go deeper into children.
            // If node.children is undefined/null, we can't go deeper, so just return node unchanged.
            if (node.children) {
                return {
                    ...node,
                    children: updateNode(node.children, id_path.slice(1), getNewNode(node)),
                };
            }
        }

        // If it's not the matching node, or if it's not along the correct path, leave it as is.
        return node;
    });
}


export function addNode(
    nodes: TreeNode[],
    id_path: string[],
    newNode: TreeNode
): TreeNode[] {
    // If no path, add at the root level
    if (id_path.length === 0) {
        return [...nodes, newNode];
    }

    return nodes.map((node) => {
        // If this node matches the first id of the path
        if (node.id === id_path[0]) {
            // If this is the last id in the path, add the new node to its children
            if (id_path.length === 1) {
                const currentChildren = node.children || [];
                return {
                    ...node,
                    children: [...currentChildren, newNode],
                };
            }
            // Otherwise, recurse deeper if children exist
            if (node.children) {
                return {
                    ...node,
                    children: addNode(node.children, id_path.slice(1), newNode),
                };
            }
        }
        // Unrelated node or path doesn’t match => leave node unchanged
        return node;
    });
}

export function removeNode(
    nodes: TreeNode[],
    id_path: string[]
): TreeNode[] {
    // No path => nothing to remove
    if (id_path.length === 0) {
        return nodes;
    }

    // First, recursively update children if needed
    const updated = nodes.map((node) => {
        // If this node is the one on the path
        if (node.id === id_path[0]) {
            // If it's not the last ID, go deeper into children
            if (id_path.length > 1 && node.children) {
                return {
                    ...node,
                    children: removeNode(node.children, id_path.slice(1)),
                };
            }
        }
        // Otherwise, or if children do not exist, just return node unchanged
        return node;
    });

    // Next, filter out the node if we are at the final step in the path
    if (id_path.length === 1) {
        return updated.filter((node) => node.id !== id_path[0]);
    }

    // If not at the last step, return the updated array
    return updated;
}
