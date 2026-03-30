import {create} from 'zustand';
import {useRelationsState} from "@/state/relations.state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {GetEntityTypeDisplayName, IsEntityType, RelationZustandEntityType} from "@/state/entities/entity-functions";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";
import {RelationState} from "@/model/relation-state";

export type RenameEntityType = RelationZustandEntityType | 'folder';

interface RenameDialogParams {
    entityType: RenameEntityType;
    entityId: string;
    currentName: string;
    path?: string[];
}

interface OpenRelationRenameParams {
    relationState: RelationState;
    updateRelation: (newRelation: RelationState) => void;
}

interface RenameDialogState {
    isOpen: boolean;
    entityType?: RenameEntityType;
    entityId?: string;
    currentName?: string;
    path?: string[];
    // Stored internally for relation renames — context-aware update callback
    _relationState?: RelationState;
    _updateRelation?: (newRelation: RelationState) => void;
}

interface RenameDialogActions {
    openRenameDialog: (params: RenameDialogParams) => void;
    openRelationRenameDialog: (params: OpenRelationRenameParams) => void;
    confirmRename: (newName: string) => void;
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
            _relationState: undefined,
            _updateRelation: undefined,
        });
    },

    openRelationRenameDialog: (params: OpenRelationRenameParams) => {
        const {relationState, updateRelation} = params;
        set({
            isOpen: true,
            entityType: 'relations',
            entityId: relationState.id,
            currentName: relationState.viewState.displayName,
            path: [],
            _relationState: relationState,
            _updateRelation: updateRelation,
        });
    },

    confirmRename: (newName: string) => {
        const {entityType, entityId, path, _relationState, _updateRelation} = get();
        if (!entityType || !entityId) return;

        const relationsState = useRelationsState.getState();

        if (entityType === 'folder') {
            const node = findNodeInTrees(relationsState.editorElements, path ?? []);
            if (node) {
                relationsState.updateEditorElements(path ?? [], {...node, name: newName});
            }
        } else if (entityType === 'relations') {
            // Use provided context (workflow/dashboard) or fall back to global store (standalone)
            const relationState = _relationState ?? relationsState.relations[entityId];
            const updateRelation = _updateRelation ?? relationsState.updateRelation;
            if (relationState) {
                const actions = getRelationActions({relationState, updateRelation});
                actions.setDisplayName(newName, path);
            }
        } else if (IsEntityType(entityType)) {
            relationsState.setEntityDisplayName(entityType, entityId, newName, path ?? []);
        }

        set({isOpen: false, _relationState: undefined, _updateRelation: undefined});
    },

    close: () => {
        set({isOpen: false, _relationState: undefined, _updateRelation: undefined});
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
