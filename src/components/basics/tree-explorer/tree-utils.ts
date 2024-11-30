
export interface TreeNode {
    id: string;
    name: string; // also serves as unique key
    type: string;
    children?: TreeNode[];
}

export function findNodeInTrees(trees: TreeNode[], id_path: string[]): TreeNode | undefined {

    console.log(trees);
    console.log(id_path);
    for (const tree of trees) {
        const node = findNode(tree, id_path);
        if (node) {
            return node;
        }
    }

    return undefined;
}

export function findNodeParentInTrees(trees: TreeNode[], id_path: string[]): TreeNode | undefined {
    for (const tree of trees) {
        const node = findNodeParent(tree, id_path);
        if (node) {
            return node;
        }
    }

    return undefined;
}

export function findNodeParent(tree: TreeNode, id_path: string[]): TreeNode | undefined {
    if (id_path.length === 1) {
        return tree;
    }

    const ids_without_last = id_path.slice(0, -1);
    return findNode(tree, ids_without_last);
}

export function findNode(tree: TreeNode, id_path: string[]): TreeNode | undefined {
    if (id_path.length === 0) {
        return tree;
    }

    const [id, ...rest] = id_path;
    const child = tree.children?.find((child) => child.id === id);

    if (child) {
        return findNode(child, rest);
    }

    return undefined;
}