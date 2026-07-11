/**
 * Spaces routing core — the single source of truth mapping content nodes to
 * `/spaces/...` URLs and back.
 *
 * Only the content tier is addressable: folders + relations + dashboards +
 * canvases, all of which live in the one `editorElements` tree
 * (`tree-utils.ts`). A URL is just a walk down that tree by each node's
 * derived macro name (`macro-name.ts`).
 *
 * `parseRoute` is deliberately pure — it does NOT touch app state. It only
 * splits the path into raw segments; resolving folder-vs-leaf against the
 * tree happens in the view (`spaces-router.tsx`).
 */

import {findPathById, findNodeInTrees, TreeNode} from "@/components/basics/files/tree-utils";
import {computeSiblingMacroNames} from "@/state/routing/macro-name";

export const SPACES_ROOT = "/workspace";
export const DATA_ROOT = "/data";

export interface Resolved {
    /** 'spaces-root' | 'spaces' | 'notfound' — 'spaces' still needs tree resolution */
    view: string;
    params: { segments: string[] };
}

/** path -> {view, segments}. Pure; no state access, no data fetching. */
export function parseRoute(pathname: string): Resolved {
    const path = (pathname || "").split("?")[0].split("#")[0];
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

    if (parts.length === 0) return {view: "spaces-root", params: {segments: []}};
    if (parts[0] === "workspace") {
        const segments = parts.slice(1);
        return segments.length === 0
            ? {view: "spaces-root", params: {segments: []}}
            : {view: "spaces", params: {segments}};
    }
    return {view: "notfound", params: {segments: parts}};
}

/**
 * Walk the tree following macro-name segments. Returns the matched node, or
 * undefined if any segment does not resolve.
 */
export function findNodeByMacroPath(trees: TreeNode[], segments: string[]): TreeNode | undefined {
    let level: TreeNode[] | null | undefined = trees;
    let node: TreeNode | undefined;
    for (const segment of segments) {
        if (!level) return undefined;
        const macroNames = computeSiblingMacroNames(level);
        node = level.find((n) => macroNames.get(n.id) === segment);
        if (!node) return undefined;
        level = node.children as TreeNode[] | null | undefined;
    }
    return node;
}

/**
 * The macro-name segment path for a node id, or undefined if not found.
 * Inverse of findNodeByMacroPath on the same tree.
 */
export function macroPathForId(trees: TreeNode[], id: string): string[] | undefined {
    const idPath = findPathById(trees, id);
    if (!idPath) return undefined;

    const segments: string[] = [];
    let level: TreeNode[] | null | undefined = trees;
    for (const nodeId of idPath) {
        if (!level) return undefined;
        const macroNames = computeSiblingMacroNames(level);
        const segment = macroNames.get(nodeId);
        const next: TreeNode | undefined = level.find((n) => n.id === nodeId);
        if (segment === undefined || !next) return undefined;
        segments.push(segment);
        level = next.children as TreeNode[] | null | undefined;
    }
    return segments;
}

/** Build the `/spaces/...` URL for a content node id. */
export function routeForNodeId(trees: TreeNode[], id: string): string | undefined {
    const segments = macroPathForId(trees, id);
    if (!segments) return undefined;
    return routeForSegments(segments);
}

export function routeForSegments(segments: string[]): string {
    if (segments.length === 0) return SPACES_ROOT;
    return SPACES_ROOT + "/" + segments.map(encodeURIComponent).join("/");
}

/** Convenience: resolve the node currently addressed by a pathname. */
export function resolveNodeFromPath(trees: TreeNode[], pathname: string): TreeNode | undefined {
    const {view, params} = parseRoute(pathname);
    if (view !== "spaces") return undefined;
    return findNodeByMacroPath(trees, params.segments);
}

/** Human-readable crumb labels (name) + their `/spaces/...` link, for a segment path. */
export interface Crumb {
    id: string;
    label: string;
    to: string;
    type: string;
}

export function crumbsForSegments(trees: TreeNode[], segments: string[]): Crumb[] {
    const crumbs: Crumb[] = [];
    let level: TreeNode[] | null | undefined = trees;
    const prefix: string[] = [];
    for (const segment of segments) {
        if (!level) break;
        const macroNames = computeSiblingMacroNames(level);
        const node: TreeNode | undefined = level.find((n) => macroNames.get(n.id) === segment);
        if (!node) break;
        prefix.push(segment);
        crumbs.push({id: node.id, label: node.name, to: routeForSegments([...prefix]), type: node.type});
        level = node.children as TreeNode[] | null | undefined;
    }
    return crumbs;
}

/** Re-export so callers only depend on this module for tree lookups. */
export {findNodeInTrees};
