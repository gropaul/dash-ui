/**
 * Macro names — URL-safe slugs derived from a node's display name.
 *
 * A "macro name" is the segment used to address a content node (folder /
 * relation / dashboard / canvas) inside a `/spaces/...` URL. It is DERIVED
 * from the display name (not stored) and made unique among its siblings by a
 * deterministic suffix. Because moving/reordering items is not supported,
 * the derivation is stable, which makes `routeForNodeId` and
 * `findNodeByMacroPath` exact inverses on the live tree.
 */

const FALLBACK_SLUG = "untitled";

/** Lowercase, ascii-fold-ish, non-alphanumerics → single dash, trimmed. */
export function slugify(name: string): string {
    const slug = (name ?? "")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "") // strip combining marks
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")     // any run of non-alphanumerics → one dash
        .replace(/^-+|-+$/g, "");        // trim leading/trailing dashes
    return slug.length > 0 ? slug : FALLBACK_SLUG;
}

interface HasNameAndId {
    id: string;
    name: string;
}

/**
 * Compute the macro name for every node in a sibling list, resolving slug
 * collisions deterministically by order (`foo`, `foo-2`, `foo-3`, ...).
 * Returns a map keyed by node id.
 */
export function computeSiblingMacroNames(siblings: HasNameAndId[]): Map<string, string> {
    const used = new Map<string, number>(); // base slug -> count seen
    const result = new Map<string, string>();
    for (const node of siblings) {
        const base = slugify(node.name);
        const seen = used.get(base) ?? 0;
        used.set(base, seen + 1);
        result.set(node.id, seen === 0 ? base : `${base}-${seen + 1}`);
    }
    return result;
}
