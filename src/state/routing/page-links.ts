import {EditorFolder} from "@/model/editor-folder";
import {findNodeInTrees, findPathById, TreeAction} from "@/components/basics/files/tree-utils";

/**
 * Pages link each other, and their blocks take in queries, by paths relative to the page's folder, as files
 * next to each other would have them: `[Sales](<../Q3/Sales.md>)`, `-- input: ../sales/orders.sql`. A page is a
 * dashboard and a query a relation; their file names are their names. Names are compared ignoring case, as on
 * macOS and Windows.
 *
 * A page next to a folder of the same name is that folder's page, `Sales.md` beside `Sales/`, as a Rust module
 * file beside its directory: opening the folder shows the page, with the folder's contents below it.
 */

const PAGE_EXTENSION = '.md';
// `/` separates folders; Windows refuses the others in file names.
const FORBIDDEN_IN_NAMES = /[/\\:*?"<>|]/;

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The nodes from the root down to `id`, the node itself last. */
function nodePath(tree: EditorFolder[], id: string): EditorFolder[] | undefined {
    const ids = findPathById(tree, id);
    if (!ids) return;
    const nodes: EditorFolder[] = [];
    let level: EditorFolder[] = tree;
    for (const step of ids) {
        const node = level.find(n => n.id === step);
        if (!node) return;
        nodes.push(node);
        level = node.children ?? [];
    }
    return nodes;
}

function safeDecode(url: string) {
    try {
        return decodeURI(url);
    } catch {
        return url;
    }
}

// The file each kind of item is on disk.
const EXTENSIONS: Record<string, string> = {dashboards: PAGE_EXTENSION, relations: '.sql'};

function isRelativePath(url: string, type: string) {
    return !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('#') && safeDecode(url).toLowerCase().endsWith(EXTENSIONS[type]);
}

/** Whether `url` is a path to a page, rather than a web address or an anchor. */
export function isPagePath(url: string) {
    return isRelativePath(url, 'dashboards');
}

/** The item of kind `type` at `url`, a path relative to item `fromId`'s folder (or to the root, with a leading `/`). */
function resolvePath(tree: EditorFolder[], fromId: string, url: string, type: string): EditorFolder | undefined {
    if (!isRelativePath(url, type)) return;
    const from = nodePath(tree, fromId);
    if (!from) return;
    // The folders holding the current position; the root is the empty path.
    const folders = url.startsWith('/') ? [] : from.slice(0, -1);
    const segments = safeDecode(url).replace(/^\/+/, '').split('/');
    const last = segments.pop()!.slice(0, -EXTENSIONS[type].length);
    for (const segment of segments) {
        if (segment === '' || segment === '.') continue;
        if (segment === '..') {
            if (!folders.pop()) return;
            continue;
        }
        const level = folders.at(-1)?.children ?? tree;
        const folder = level.find(n => n.type === 'folder' && sameName(n.name, segment));
        if (!folder) return;
        folders.push(folder);
    }
    const level = folders.at(-1)?.children ?? tree;
    return level.find(n => n.type === type && sameName(n.name, last));
}

/** The page a link on page `fromId` points to, if it exists. */
export function resolvePageLink(tree: EditorFolder[], fromId: string, url: string): EditorFolder | undefined {
    return resolvePath(tree, fromId, url, 'dashboards');
}

/** The query a block of page `fromId` takes in with `-- input: <path>.sql`, if it exists. */
export function resolveQueryInput(tree: EditorFolder[], fromId: string, path: string): EditorFolder | undefined {
    return resolvePath(tree, fromId, path, 'relations');
}

/** The path from item `fromId`'s folder to the file of item `toId`, a page (`.md`) or query (`.sql`). */
export function relativePath(tree: EditorFolder[], fromId: string, toId: string): string | undefined {
    const from = nodePath(tree, fromId)?.slice(0, -1);
    const to = nodePath(tree, toId);
    if (!from || !to) return;
    let shared = 0;
    while (shared < from.length && shared < to.length - 1 && from[shared].id === to[shared].id) shared++;
    const up = Array(from.length - shared).fill('..');
    return [...up, ...to.slice(shared).map(n => n.name)].join('/') + (EXTENSIONS[to.at(-1)!.type] ?? '');
}

function siblingsOf(tree: EditorFolder[], id: string): EditorFolder[] {
    const path = nodePath(tree, id);
    return path ? path.at(-2)?.children ?? tree : [];
}

/**
 * Why `name` can't be the name of node `id` (a page or folder, which become files and folders), if it can't.
 * Only items of one kind clash: a page may have the name of the folder beside it, as its page.
 */
export function pageNameError(tree: EditorFolder[], id: string, name: string): string | undefined {
    if (!name.trim()) return 'A name is required.';
    if (FORBIDDEN_IN_NAMES.test(name)) return 'A name cannot contain / \\ : * ? " < > |';
    const type = findPage(tree, id)?.type;
    const taken = siblingsOf(tree, id).find(n => n.id !== id && n.type === type && sameName(n.name, name.trim()));
    return taken ? `"${taken.name}" is already in this folder.` : undefined;
}

/** The item of `node`'s kind named like it in the folder at `folderPath` (an id path; empty for the top level). */
export function nameTakenInFolder(tree: EditorFolder[], folderPath: string[], node: EditorFolder): EditorFolder | undefined {
    const folder = folderPath.length ? findNodeInTrees(tree, folderPath) as EditorFolder | undefined : undefined;
    const siblings = folderPath.length ? folder?.children ?? [] : tree;
    return siblings.find(n => n.id !== node.id && n.type === node.type && sameName(n.name, node.name));
}

/** The folder's page, if it has one: the page beside it with its name. */
export function folderPageOf(tree: EditorFolder[], folderId: string): EditorFolder | undefined {
    const folder = findPage(tree, folderId);
    if (folder?.type !== 'folder') return;
    return siblingsOf(tree, folderId).find(n => n.type === 'dashboards' && sameName(n.name, folder.name));
}

/** A folder's page for the folder, the folder for its page: the two move and rename together. */
export function partnerOf(tree: EditorFolder[], id: string): EditorFolder | undefined {
    return folderPageOf(tree, id) ?? pageFolderOf(tree, id);
}

/** What keeps `node`, and with it its partner, from moving into the folder at `folderPath`, if anything. */
export function moveClash(tree: EditorFolder[], folderPath: string[], node: EditorFolder): EditorFolder | undefined {
    const partner = partnerOf(tree, node.id);
    return nameTakenInFolder(tree, folderPath, node) ?? (partner && nameTakenInFolder(tree, folderPath, partner));
}

/**
 * The moves with a move added for the partner of each moved folder or folder page, so a folder and its page stay
 * side by side. Not when a page moves into its own folder; that ends the pairing.
 */
export function withPartnerMoves(tree: EditorFolder[], actions: TreeAction[]): TreeAction[] {
    return actions.flatMap((action): TreeAction[] => {
        if (action.type !== 'move') return [action];
        const partner = partnerOf(tree, action.id_path.at(-1)!);
        const partnerPath = partner && findPathById(tree, partner.id);
        if (!partnerPath || action.target_id_path.includes(partner!.id)) return [action];
        return [action, {...action, id_path: partnerPath}];
    });
}

/** The folder whose page `pageId` is, if it is one. */
export function pageFolderOf(tree: EditorFolder[], pageId: string): EditorFolder | undefined {
    const page = findPage(tree, pageId);
    if (page?.type !== 'dashboards') return;
    return siblingsOf(tree, pageId).find(n => n.type === 'folder' && sameName(n.name, page.name));
}

export function findPage(tree: EditorFolder[], id: string): EditorFolder | undefined {
    return nodePath(tree, id)?.at(-1);
}

/** All pages, other than `exceptId`. */
export function allPages(tree: EditorFolder[], exceptId?: string): EditorFolder[] {
    const pages: EditorFolder[] = [];
    const visit = (nodes: EditorFolder[]) => nodes.forEach(node => {
        if (node.type === 'dashboards' && node.id !== exceptId) pages.push(node);
        if (node.children) visit(node.children);
    });
    visit(tree);
    return pages;
}
