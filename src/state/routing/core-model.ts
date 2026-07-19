/**
 * Spaces routing core — pure tree logic mapping content nodes to slug-name segment paths
 * and back.
 *
 * Only the content tier is addressable: folders + relations + dashboards + canvases, all of
 * which live in the one `editorElements` tree (`tree-utils.ts`). A path is just a walk down
 * that tree by each node's derived macro name (`slug-name.ts`).
 *
 * This module is deliberately store- and URL-agnostic: it never touches app state and never
 * builds URLs. Turning a segment path into a URL (and vice-versa) is the navigator's job
 * (`navigation.ts`), which scopes it to the current project.
 */

import {findPathById, findNodeInTrees, TreeNode} from "@/components/basics/files/tree-utils";
import {computeSiblingSlugNames} from "@/state/routing/slug-name";

/**
 * Walk a given tree following slug-name segments. Returns the matched node, or undefined if any
 * segment does not resolve. Store-agnostic — used for augmented trees (`buildRoutableTree`) and in
 * tests. For the live editor tree use the store-aware `getObjectFromLocation` on `DashNavigator`.
 */
export function nodeAtObjectSlugPath(trees: TreeNode[], segments: string[]): TreeNode | undefined {
    let level: TreeNode[] | null | undefined = trees;
    let node: TreeNode | undefined;
    for (const segment of segments) {
        if (!level) return undefined;
        const slugNames = computeSiblingSlugNames(level);
        node = level.find((n) => slugNames.get(n.id) === segment);
        if (!node) return undefined;
        level = node.children as TreeNode[] | null | undefined;
    }
    return node;
}

/**
 * The slug-name segment path for a node id, or undefined if not found.
 * Inverse of nodeAtObjectPath on the same tree.
 */
export function objectSlugPathForId(trees: TreeNode[], id: string): string[] | undefined {
    const idPath = findPathById(trees, id);
    if (!idPath) return undefined;

    const segments: string[] = [];
    let level: TreeNode[] | null | undefined = trees;
    for (const nodeId of idPath) {
        if (!level) return undefined;
        const slugNames = computeSiblingSlugNames(level);
        const segment = slugNames.get(nodeId);
        const next: TreeNode | undefined = level.find((n) => n.id === nodeId);
        if (segment === undefined || !next) return undefined;
        segments.push(segment);
        level = next.children as TreeNode[] | null | undefined;
    }
    return segments;
}

/** Human-readable crumb labels (name) + the slug-name segment path up to each, for a path. */
export interface Crumb {
    id: string;
    label: string;
    /** Cumulative slug-name segments from the root to this crumb (turn into a URL via the navigator). */
    segments: string[];
    type: string;
}

export function crumbsForSegments(trees: TreeNode[], segments: string[]): Crumb[] {
    const crumbs: Crumb[] = [];
    let level: TreeNode[] | null | undefined = trees;
    const prefix: string[] = [];
    for (const segment of segments) {
        if (!level) break;
        const slugNames = computeSiblingSlugNames(level);
        const node: TreeNode | undefined = level.find((n) => slugNames.get(n.id) === segment);
        if (!node) break;
        prefix.push(segment);
        crumbs.push({id: node.id, label: node.name, segments: [...prefix], type: node.type});
        level = node.children as TreeNode[] | null | undefined;
    }
    return crumbs;
}

/** Re-export so callers only depend on this module for tree lookups. */
export {findNodeInTrees};
