import {create} from 'zustand';
import {useRelationsState} from "@/state/relations.state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {GetEntityTypeDisplayName, IsEntityType, RelationZustandEntityType} from "@/state/entities/entity-functions";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";
import {RelationState} from "@/model/relation-state";
import {getMacroName, renameAllMacroReferences} from "@/state/relations/sql/table-macros";
import {getAllRelations} from "@/state/relations/all-relation-utils";

export type RenameEntityType = RelationZustandEntityType | 'folder';

interface RenameDialogParams {
    entityType: RenameEntityType;
    entityId: string;
    currentName: string;
    path?: string[];
}

interface RenameDialogState {
    isOpen: boolean;
    entityType?: RenameEntityType;
    entityId?: string;
    currentName?: string;
    path?: string[];
}

interface RenameDialogActions {
    openRenameDialog: (params: RenameDialogParams) => void;
    openRelationRenameDialog: (relationState: RelationState) => void;
    confirmRename: (newName: string, macroName?: string, updateReferences?: boolean) => void;
    close: () => void;
}

export type RenameDialogStore = RenameDialogState & RenameDialogActions;

export const useRenameDialogStore = create<RenameDialogStore>((set, get) => ({
    isOpen: false,

    openRenameDialog: (params: RenameDialogParams) => {
        set({
            isOpen: true,
            entityType: params.entityType,
            entityId: params.entityId,
            currentName: params.currentName,
            path: params.path ?? [],
        });
    },

    openRelationRenameDialog: (relationState: RelationState) => {
        set({
            isOpen: true,
            entityType: 'relations',
            entityId: relationState.id,
            currentName: relationState.viewState.displayName,
            path: [],
        });
    },

    confirmRename: (newName: string, macroName?: string, updateReferences?: boolean) => {
        const {entityType, entityId, path} = get();
        if (!entityType || !entityId) return;

        const relationsState = useRelationsState.getState();

        if (entityType === 'folder') {
            const node = findNodeInTrees(relationsState.editorElements, path ?? []);
            if (node) {
                relationsState.updateEditorElements(path ?? [], {...node, name: newName});
            }
        } else if (entityType === 'relations') {
            // Update macro references in other relations' SQL before renaming
            if (updateReferences && macroName) {
                const newMacroName = getMacroName(newName);
                if (macroName !== newMacroName) {
                    renameAllMacroReferences(macroName, newMacroName, entityId);
                }
            }

            // Find the relation fresh via getAllRelations() to get a zustand-direct updateRelation.
            // Using a stored callback from the caller (e.g. relation-node.tsx) would go through
            // useUndoableFlow.setNodes which uses a stale lastNodesRef, overwriting macro reference changes.
            const entry = getAllRelations().find(e => e.relation.id === entityId);
            if (entry) {
                const actions = getRelationActions({relationState: entry.relation, updateRelation: entry.updateRelation});
                actions.setDisplayName(newName, path);
            }
        } else if (IsEntityType(entityType)) {
            relationsState.setEntityDisplayName(entityType, entityId, newName, path ?? []);
        }

        set({isOpen: false});
    },

    close: () => {
        set({isOpen: false});
    },
}));

/**
 * Get the dialog title based on entity type.
 */
export function getRenameDialogTitle(entityType?: RenameEntityType): string {
    if (!entityType) return 'Rename';
    if (entityType === 'folder') return 'Rename Folder';
    if (IsEntityType(entityType)) {
        return `Rename ${GetEntityTypeDisplayName(entityType)}`;
    }
    return 'Rename';
}

/**
 * Get the dialog description based on entity type and current name.
 */
export function getRenameDialogDescription(entityType?: RenameEntityType, currentName?: string): string | undefined {
    if (!entityType || !currentName) return undefined;
    if (entityType === 'folder') {
        return 'Enter a new name for the folder.';
    }
    if (IsEntityType(entityType)) {
        const typeDisplayName = GetEntityTypeDisplayName(entityType);
        return `Enter a new name for the ${typeDisplayName.toLowerCase()} "${currentName}".`;
    }
    return undefined;
}
