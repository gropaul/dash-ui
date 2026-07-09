/**
 * Routing augmentation: dashboards and canvases don't have children in the editor
 * tree, but they *reference* relations (dashboard widgets / canvas nodes). This
 * exposes those referenced relations as **virtual children** of their container so
 * a relation can be addressed — and shown in the breadcrumb — in the context of the
 * dashboard/canvas it was opened from (e.g. `…/Sales Dashboard/Q4 Revenue`), instead
 * of teleporting to its canonical location.
 *
 * These virtual children are aliases: the relation still lives at its own path. The
 * breadcrumb flags them (parent type is `dashboards`/`canvas`) and links to the real
 * location.
 *
 * Kept out of the pure `core-model` so that module stays store-agnostic; callers pass
 * the store slices in.
 */

import {EditorFolder} from "@/model/editor-folder";
import {RelationState} from "@/model/relation-state";
import {DashboardState} from "@/model/dashboard-state";
import {CanvasState} from "@/model/canvas-state";
import {findNodeByMacroPath, macroPathForId, routeForSegments} from "@/state/routing/core-model";
import {computeSiblingMacroNames} from "@/state/routing/macro-name";

type Relations = Record<string, RelationState>;
type Dashboards = Record<string, DashboardState>;
type Canvases = Record<string, CanvasState>;

// Distinct relation ids referenced by a dashboard's widgets (in reading order).
function dashboardRelationIds(dashboard: DashboardState): string[] {
    const ids = Object.values(dashboard.widgets)
        .filter((w) => w.type === "relation" && w.relationId)
        .map((w) => w.relationId!);
    return Array.from(new Set(ids));
}

// Distinct relation ids referenced by a canvas' relation nodes (in node order).
function canvasRelationIds(canvas: CanvasState): string[] {
    const ids = canvas.nodes
        .map((n) => (n.data as {relationId?: string} | undefined)?.relationId)
        .filter((id): id is string => !!id);
    return Array.from(new Set(ids));
}

/**
 * A copy of `base` where every `dashboards`/`canvas` node gains its referenced
 * relations as virtual `relations` children. Nodes with no resolvable relations are
 * left untouched.
 */
export function buildRoutableTree(
    base: EditorFolder[],
    relations: Relations,
    dashboards: Dashboards,
    canvas: Canvases,
): EditorFolder[] {
    const virtualChild = (relationId: string): EditorFolder => ({
        id: relationId,
        name: relations[relationId]?.viewState.displayName ?? "Untitled",
        type: "relations",
        children: null,
    });

    const mapNode = (node: EditorFolder): EditorFolder => {
        if (node.type === "dashboards") {
            const ids = dashboards[node.id] ? dashboardRelationIds(dashboards[node.id]) : [];
            const children = ids.filter((id) => relations[id]).map(virtualChild);
            return children.length ? {...node, children} : node;
        }
        if (node.type === "canvas") {
            const ids = canvas[node.id] ? canvasRelationIds(canvas[node.id]) : [];
            const children = ids.filter((id) => relations[id]).map(virtualChild);
            return children.length ? {...node, children} : node;
        }
        if (node.children && node.children.length) {
            return {...node, children: node.children.map(mapNode)};
        }
        return node;
    };

    return base.map(mapNode);
}

/**
 * The contextual `/workspace/...` URL for a relation shown under a container
 * (dashboard/canvas) — the container's own path plus the relation's macro name among
 * the container's virtual children. Returns undefined if the container or relation
 * can't be resolved. `tree` must be a `buildRoutableTree` result.
 */
export function aliasRelationRoute(
    tree: EditorFolder[],
    containerId: string,
    relationId: string,
): string | undefined {
    const containerSegments = macroPathForId(tree, containerId);
    if (!containerSegments) return undefined;
    const container = findNodeByMacroPath(tree, containerSegments) as EditorFolder | undefined;
    const children = (container?.children ?? []) as EditorFolder[];
    const macro = computeSiblingMacroNames(children).get(relationId);
    if (!macro) return undefined;
    return routeForSegments([...containerSegments, macro]);
}
