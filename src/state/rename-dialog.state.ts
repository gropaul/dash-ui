import {create} from 'zustand';
import {useRelationsState} from "@/state/relations.state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {GetEntityTypeDisplayName, IsEntityType, RelationZustandEntityType} from "@/state/entities/entity-functions";
import {findNodeInTrees, findPathById} from "@/components/basics/files/tree-utils";
import {RelationState} from "@/model/relation-state";
import {sanitizeMacroName} from "@/platform/sql-utils";
import {renameRefsInMarkdown} from "@/model/dashboard-state";
import {isPageBlock, renamePageBlock} from "@/state/relations/sql/page-refs";
import {partnerOf} from "@/state/routing/page-links";
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
    confirmRename: (newName: string, updateReferences: boolean) => void;
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

    confirmRename: (newName: string, updateReferences: boolean) => {
        const {entityType, entityId, path, currentName} = get();
        if (!entityType || !entityId) return;

        const relationsState = useRelationsState.getState();
        const before = relationsState.editorElements;

        if (entityType === 'folder') {
            const node = findNodeInTrees(relationsState.editorElements, path ?? []);
            if (node) {
                relationsState.updateEditorElements(path ?? [], {...node, name: newName, lastEditedAt: Date.now()});
            }
        } else if (entityType === 'relations' && isPageBlock(entityId)) {
            renamePageBlock(entityId, newName, updateReferences);
        } else if (entityType === 'relations') {
            // Update the calls of its refs.<name>() in other relations and in dashboards before renaming
            const from = sanitizeMacroName(currentName ?? '');
            const to = sanitizeMacroName(newName);
            if (updateReferences && from && from !== to) {
                RelationActions.renameInAllQueries(from, to, entityId);
                for (const dashboard of Object.values(relationsState.dashboards)) {
                    const markdown = renameRefsInMarkdown(dashboard.markdown ?? '', from, to);
                    if (markdown !== (dashboard.markdown ?? '')) relationsState.setDashboardMarkdown(dashboard.id, markdown);
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
        // A folder and its page keep one name.
        const partner = entityType === 'folder' || entityType === 'dashboards' ? partnerOf(before, entityId) : undefined;
        if (partner?.type === 'dashboards') {
            relationsState.setEntityDisplayName('dashboards', partner.id, newName, []);
        } else if (partner) {
            const partnerPath = findPathById(useRelationsState.getState().editorElements, partner.id) ?? [];
            relationsState.updateEditorElements(partnerPath, {...partner, name: newName, lastEditedAt: Date.now()});
        }
        // A page's, folder's or query's name is part of the paths pages link it or take it in by. Loaded on
        // demand: the page editor's modules import this store.
        if (entityType === 'folder' || entityType === 'dashboards' || entityType === 'relations' && !isPageBlock(entityId)) {
            void import("@/components/page-editor/page-links").then(m => m.updatePageLinks(before));
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
