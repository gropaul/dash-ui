import {create} from 'zustand';
import {useRelationsState} from "@/state/relations.state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {GetEntityTypeDisplayName, IsEntityType, RelationZustandEntityType} from "@/state/entities/entity-functions";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";
import {RelationState} from "@/model/relation-state";
import {getMacroName} from "@/state/relations/sql/table-macros";
import {RelationActions} from "@/state/relations/actions/static-actions";
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
    mode: 'rename' | 'create';
    entityType?: RenameEntityType;
    entityId?: string;
    currentName?: string;
    path?: string[];
    onCreate?: (name: string) => void;
}

interface RenameDialogActions {
    openRenameDialog: (params: RenameDialogParams) => void;
    openRelationRenameDialog: (relationState: RelationState) => void;
    openCreateDialog: (entityType: RenameEntityType, onCreate: (name: string) => void) => void;
    confirmRename: (newName: string, macroName?: string, updateReferences?: boolean) => void;
    close: () => void;
}

export type RenameDialogStore = RenameDialogState & RenameDialogActions;

export const useRenameDialogStore = create<RenameDialogStore>((set, get) => ({
    isOpen: false,
    mode: 'rename',

    openRenameDialog: (params: RenameDialogParams) => {
        set({
            isOpen: true,
            mode: 'rename',
            entityType: params.entityType,
            entityId: params.entityId,
            currentName: params.currentName,
            path: params.path ?? [],
            onCreate: undefined,
        });
    },

    openRelationRenameDialog: (relationState: RelationState) => {
        set({
            isOpen: true,
            mode: 'rename',
            entityType: 'relations',
            entityId: relationState.id,
            currentName: relationState.viewState.displayName,
            path: [],
            onCreate: undefined,
        });
    },

    openCreateDialog: (entityType: RenameEntityType, onCreate: (name: string) => void) => {
        set({
            isOpen: true,
            mode: 'create',
            entityType,
            entityId: undefined,
            currentName: '',
            path: [],
            onCreate,
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
                    RelationActions.renameInAllQueries(macroName, newMacroName, entityId);
                }
            }

            // Find the relation fresh via getAllRelations() to get a zustand-direct updateRelation.
            // Using a stored callback from the caller (e.g. relation-node.tsx) would go through
            // useUndoableFlow.setNodes which uses a stale lastNodesRef, overwriting macro reference changes.
            const entry = getAllRelations().find(e => e.relation.id === entityId);
            if (entry) {
                const actions = getRelationActions({mode: 'fullscreen', relationState: entry.relation, updateRelation: entry.updateRelation});
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
 * Get the create dialog title based on entity type.
 */
export function getCreateDialogTitle(entityType?: RenameEntityType): string {
    if (!entityType) return 'New Item';
    if (entityType === 'folder') return 'New Folder';
    if (entityType === 'relations') return 'New Query';
    if (entityType === 'dashboards') return 'New Dashboard';
    if (entityType === 'canvas') return 'New Canvas';
    if (IsEntityType(entityType)) {
        return `New ${GetEntityTypeDisplayName(entityType)}`;
    }
    return 'New Item';
}

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
