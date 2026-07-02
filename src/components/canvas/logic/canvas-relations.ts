import {RelationState} from "@/model/relation-state";
import {useRelationsState} from "@/state/relations.state";
import {findPathById} from "@/components/basics/files/tree-utils";

/**
 * Register a relation in state for a canvas node.
 *
 * The relation is added to the editor tree as a sibling of the canvas
 * (i.e. at the canvas's own tree level) and is not opened in a tab.
 * This is the single source of truth for where canvas-owned relations
 * live in the editor tree — change the placement here, not at call sites.
 */
export function addRelationForCanvas(canvasId: string, relation: RelationState): void {
    const storeState = useRelationsState.getState();
    const canvasPath = findPathById(storeState.editorElements, canvasId);
    const parentPath = canvasPath ? canvasPath.slice(0, -1) : [];
    storeState.addNewRelation('', parentPath, relation, false);
}
