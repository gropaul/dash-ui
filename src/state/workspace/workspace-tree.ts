import {baseName, extensionOf, parentOf} from "@/state/workspace/paths";

export type WorkspaceNodeKind = 'folder' | 'page' | 'query' | 'canvas' | 'file';

export interface WorkspaceNode {
    path: string;
    /** The file name without a known extension (`Q3` for `Q3.md`); a folder's or other file's full name. */
    name: string;
    kind: WorkspaceNodeKind;
    children?: WorkspaceNode[];
}

const KIND_BY_EXTENSION: Record<string, WorkspaceNodeKind> = {'.md': 'page', '.sql': 'query', '.canvas': 'canvas'};

export function kindOf(path: string): WorkspaceNodeKind {
    return KIND_BY_EXTENSION[extensionOf(path)] ?? 'file';
}

function nodeName(path: string, kind: WorkspaceNodeKind) {
    const name = baseName(path);
    return kind === 'folder' || kind === 'file' ? name : name.slice(0, -extensionOf(path).length);
}

/** Folders first, then by name ignoring case. */
function compareNodes(a: WorkspaceNode, b: WorkspaceNode) {
    if ((a.kind === 'folder') !== (b.kind === 'folder')) return a.kind === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}) || a.path.localeCompare(b.path);
}

/** The tree of the workspace's folders and files. `dirs` must hold every folder, as the store's do. */
export function buildWorkspaceTree(filePaths: Iterable<string>, dirs: Iterable<string>): WorkspaceNode[] {
    const folders = new Map<string, WorkspaceNode>();
    const root: WorkspaceNode[] = [];
    const childrenOf = (dir: string) => dir === '' ? root : folders.get(dir)?.children ?? root;

    const sortedDirs = [...dirs].sort((a, b) => a.split('/').length - b.split('/').length);
    for (const dir of sortedDirs) {
        const node: WorkspaceNode = {path: dir, name: baseName(dir), kind: 'folder', children: []};
        folders.set(dir, node);
        childrenOf(parentOf(dir)).push(node);
    }
    for (const path of filePaths) {
        const kind = kindOf(path);
        childrenOf(parentOf(path)).push({path, name: nodeName(path, kind), kind});
    }

    const sort = (nodes: WorkspaceNode[]) => {
        nodes.sort(compareNodes);
        nodes.forEach(node => node.children && sort(node.children));
    };
    sort(root);
    return root;
}
