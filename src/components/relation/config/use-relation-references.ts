import {useMemo} from "react";
import {useRelationsState} from "@/state/relations.state";
import {RelationState} from "@/model/relation-state";
import {extractMacroRefs, sanitizeMacroName} from "@/state/relations/sql/table-macros";
import {getRelationDependencies} from "@/state/relations/relation-dependencies";
import {objectSlugPathForId} from "@/state/routing/core-model";

export interface ReferenceEntry {
    /** Object id, or the raw macro name when the reference could not be resolved. */
    id: string;
    name: string;
    /** Icon key for `defaultIconFactory` - a relation view type, 'dashboard' or 'canvas'. */
    iconType: string;
    /** Secondary text on the right of the row. */
    detail?: string;
    /** False when the object has no address in the workspace tree, e.g. a canvas-only relation. */
    navigable: boolean;
}

export interface RelationReferences {
    /** Relations whose SQL calls this relation's `refs.<name>()` macro. */
    usedByRelations: ReferenceEntry[];
    /** Relations this relation's SQL calls. */
    usesRelations: ReferenceEntry[];
    dashboards: ReferenceEntry[];
    canvases: ReferenceEntry[];
}

/**
 * Everything the References tab shows, recomputed whenever the relations, dashboards or canvases
 * change. Both relation directions come from `extractMacroRefs` rather than
 * `findMacroReferences`, because the sanitized-name comparison also matches calls written without
 * the `dash.` catalog prefix.
 */
export function useRelationReferences(relationState: RelationState): RelationReferences {
    const relations = useRelationsState(state => state.relations);
    const dashboards = useRelationsState(state => state.dashboards);
    const canvas = useRelationsState(state => state.canvas);
    const editorElements = useRelationsState(state => state.editorElements);

    const id = relationState.id;
    const macroName = sanitizeMacroName(relationState.viewState.displayName);
    const baseQuery = relationState.query.baseQuery;

    return useMemo(() => {
        const navigable = (objectId: string) =>
            objectSlugPathForId(editorElements, objectId) !== undefined;

        const others = Object.values(relations).filter(r => r.id !== id);

        const usedByRelations: ReferenceEntry[] = others
            .filter(r => extractMacroRefs(r.query.baseQuery ?? '').includes(macroName))
            .map(r => toRelationEntry(r, navigable(r.id)));

        // resolve each ref in our own SQL back to the relation that owns that macro name
        const byMacroName = new Map(
            others.map(r => [sanitizeMacroName(r.viewState.displayName), r] as const),
        );
        const usesRelations: ReferenceEntry[] = extractMacroRefs(baseQuery ?? '').map(ref => {
            const target = byMacroName.get(ref);
            if (!target) {
                // the macro is called but no relation owns that name (renamed or deleted)
                return {id: ref, name: `refs.${ref}()`, iconType: 'relation', detail: 'unresolved', navigable: false};
            }
            return toRelationEntry(target, navigable(target.id));
        });

        const dependencies = getRelationDependencies(id);

        const dashboardEntries: ReferenceEntry[] = dependencies.dashboards.map(d => ({
            id: d.dashboardId,
            name: d.dashboardName,
            iconType: 'dashboard',
            detail: widgetCount(d.widgetIds.length),
            navigable: navigable(d.dashboardId),
        }));

        const canvasEntries: ReferenceEntry[] = dependencies.canvases.map(c => ({
            id: c.canvasId,
            name: c.canvasName,
            iconType: 'canvas',
            detail: nodeCount(c.nodeIds.length),
            navigable: navigable(c.canvasId),
        }));

        return {
            usedByRelations,
            usesRelations,
            dashboards: dashboardEntries,
            canvases: canvasEntries,
        };
        // `dashboards` and `canvas` are read through getRelationDependencies, not directly
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [relations, dashboards, canvas, editorElements, id, macroName, baseQuery]);
}

function toRelationEntry(relation: RelationState, navigable: boolean): ReferenceEntry {
    return {
        id: relation.id,
        name: relation.viewState.displayName,
        iconType: relation.viewState.selectedView,
        navigable,
    };
}

function widgetCount(count: number): string | undefined {
    return count > 1 ? `${count} widgets` : undefined;
}

function nodeCount(count: number): string | undefined {
    return count > 1 ? `${count} nodes` : undefined;
}
