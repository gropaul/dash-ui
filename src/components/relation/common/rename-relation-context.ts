import {createContext} from "react";
import {RelationState} from "@/model/relation-state";

/**
 * Renames the relation shown. A query is renamed as its file (the default); a page provides the rename of its
 * blocks, which needs its editor.
 */
export const RenameRelationContext = createContext<((relation: RelationState) => void) | null>(null);
