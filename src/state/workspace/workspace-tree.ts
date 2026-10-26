import {baseName, extensionOf, parentOf} from "@/state/workspace/paths";
import {PROJECT_CONFIG_FILE, SOURCES_FILE} from "@/platform/global-data";

/** `sources` is the project's `sources.sql`, shown in the tree but opened as the data sources, not a query. */
export type WorkspaceNodeKind = 'folder' | 'page' | 'query' | 'sources' | 'canvas' | 'file';

export interface WorkspaceNode {
    path: string;
    /** The file name without a known extension (`Q3` for `Q3.md`); a folder's or other file's full name. */
    name: string;
    kind: WorkspaceNodeKind;
    children?: WorkspaceNode[];
}

const KIND_BY_EXTENSION: Record<string, WorkspaceNodeKind> = {'.md': 'page', '.sql': 'query', '.canvas': 'canvas'};

export function kindOf(path: string): WorkspaceNodeKind {
    if (path === SOURCES_FILE) return 'sources';
    return KIND_BY_EXTENSION[extensionOf(path)] ?? 'file';
}

export const isQuery = (path: string) => kindOf(path) === 'query';
export const isPage = (path: string) => kindOf(path) === 'page';

/** Canvases are disabled while project content moves to files, and `dash.yaml` is the project's: no listing shows them. */
export const isListed = (path: string) => kindOf(path) !== 'canvas' && path !== PROJECT_CONFIG_FILE;

/** What a file is called: its name without a known extension (`Q3` for `Q3.md`); a folder's or other file's full name. */
export function displayName(path: string, kind: WorkspaceNodeKind = kindOf(path)): string {
    const name = baseName(path);
    return kind === 'folder' || kind === 'file' || kind === 'sources' ? name : name.slice(0, -extensionOf(path).length);
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
        if (!isListed(path)) continue;
        const kind = kindOf(path);
        childrenOf(parentOf(path)).push({path, name: displayName(path, kind), kind});
    }

    const sort = (nodes: WorkspaceNode[]) => {
        nodes.sort(compareNodes);
        nodes.forEach(node => node.children && sort(node.children));
    };
    sort(root);
    return root;
}
