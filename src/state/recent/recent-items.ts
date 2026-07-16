import {EntityBase} from "@/state/entities/entity-base";
import {EditorFolder} from "@/model/editor-folder";
import {RelationState} from "@/model/relation-state";
import {DashboardState} from "@/model/dashboard-state";
import {CanvasState} from "@/model/canvas-state";

/**
 * A single "recently accessed" workspace item, resolved from the editor tree + entity
 * collections. `iconType` is what `ColoredIcon` consumes: a relation's selected view type
 * (table/chart/…) for relations, otherwise the entity type (folder/dashboards/canvas).
 */
export interface RecentItem {
    id: string;
    name: string;
    type: string;
    iconType: string;
    lastViewedAt: number;
}

export interface WorkspaceCollections {
    editorElements: EditorFolder[];
    relations: Record<string, RelationState>;
    dashboards: Record<string, DashboardState>;
    canvas: Record<string, CanvasState>;
}

/** Depth-first flatten of the editor tree into a flat node list. */
export function flattenEditorTree(nodes: EditorFolder[]): EditorFolder[] {
    const out: EditorFolder[] = [];
    const walk = (list: EditorFolder[]) => {
        for (const node of list) {
            out.push(node);
            if (node.children) walk(node.children);
        }
    };
    walk(nodes);
    return out;
}

/**
 * Metadata for a node. Relations/dashboards/canvases carry it on their collection entry
 * (keyed by the shared id == node id); folders carry it on the tree node itself.
 * Mirrors `getElementMetadata` in folder-view.tsx.
 */
function metadataFor(
    node: EditorFolder,
    relations: Record<string, EntityBase>,
    dashboards: Record<string, EntityBase>,
    canvas: Record<string, EntityBase>,
): Partial<EntityBase> {
    switch (node.type) {
        case "relations":
            return relations[node.id] ?? {};
        case "dashboards":
            return dashboards[node.id] ?? {};
        case "canvas":
            return canvas[node.id] ?? {};
        default:
            return node;
    }
}

/**
 * The most recently viewed workspace items (queries/dashboards/canvases/folders), newest first.
 * Only nodes with a stamped `lastViewedAt` are included; the rest have never been navigated to.
 */
export function selectRecentWorkspaceItems(c: WorkspaceCollections, limit = 5): RecentItem[] {
    const items: RecentItem[] = [];
    for (const node of flattenEditorTree(c.editorElements)) {
        const meta = metadataFor(node, c.relations, c.dashboards, c.canvas);
        if (meta.lastViewedAt === undefined) continue;
        const iconType = node.type === "relations"
            ? (c.relations[node.id]?.viewState?.selectedView ?? "relations")
            : node.type;
        items.push({id: node.id, name: node.name, type: node.type, iconType, lastViewedAt: meta.lastViewedAt});
    }
    items.sort((a, b) => b.lastViewedAt - a.lastViewedAt);
    return items.slice(0, limit);
}
