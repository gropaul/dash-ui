'use client';

import React, {useState} from "react";
import {H5} from "@/components/ui/typography";
import {useRelationsState} from "@/state/relations.state";
import {Button} from "@/components/ui/button";
import {Copy, Folder, PencilLine, Plus, Sheet, Trash} from "lucide-react";
import {TreeExplorer} from "@/components/basics/files/tree-explorer";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {ContextMenuItem} from "@/components/ui/context-menu";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {RenameDialog} from "@/components/editor/rename-dialog";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {DeleteDialog} from "@/components/editor/delete-dialog";
import {RelationState} from "@/model/relation-state";
import {getRandomId} from "@/platform/id-utils";
import {getRelationIdFromSource, RelationSource} from "@/model/relation";


interface RenameState {
    isOpen: boolean;
    currentNode?: TreeNode;
    currentName?: string;
}

interface DeleteState {
    isOpen: boolean;
    currentNode?: TreeNode;
    title?: string;
    description?: string;
}

export function EditorOverview() {

    const [renameState, setRenameState] = useState<RenameState>({isOpen: false});
    const [deleteState, setDeleteState] = useState<DeleteState>({isOpen: false});

    const relations = useRelationsState((state) => state.relations);
    const showRelation = useRelationsState((state) => state.showRelation);
    const deleteRelation = useRelationsState((state) => state.deleteRelation);
    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationTreeElements: TreeNode[] = Object.values(relations).map<TreeNode>(relation => {
        return {
            id: relation.id,
            name: relation.viewState.displayName,
            type: 'relation',
            children: null,
            payload: relation
        };
    });

    function onTreeElementClick(_path: string[], node: TreeNode) {
        if (node.type === 'relation') {
            showRelation(node.payload);
        }
    }

    function onRename(tree: TreeNode) {
        let displayName = tree.name;
        if (tree.type === 'relation') {
            displayName = tree.payload.viewState.displayName;
        }
        setRenameState({
            isOpen: true,
            currentNode: tree,
            currentName: displayName
        });
    }

    function onRenameConfirmed(newName: string) {
        if (renameState.currentNode?.type === 'relation') {
            updateRelationViewState(renameState.currentNode.payload.id, {
                displayName: newName
            })
        }
    }

    function onDelete(tree: TreeNode) {
        if (tree.type === 'relation') {
            setDeleteState({
                isOpen: true,
                currentNode: tree,
                title: 'Delete Relation',
                description: `Are you sure you want to delete the relation "${tree.payload.viewState.displayName}"? This action cannot be undone.`
            });
            return;
        }
    }

    function onDeleteConfirmed() {
        if (deleteState.currentNode?.type === 'relation') {
            deleteRelation(deleteState.currentNode.payload.id);
        }
    }

    function onDuplicate(tree: TreeNode) {
        if (tree.type === 'relation') {
            const relation = tree.payload as RelationState;
            const newSource: RelationSource = {
                type: 'query',
                id: getRandomId(),
                name: 'New Query',
                baseQuery: relation.query.baseQuery
            };
            const newRelation: RelationState = {
                ...relation,
                id: getRelationIdFromSource(relation.connectionId, newSource),
                name: relation.name + ' (Copy)',
                viewState: {
                    ...relation.viewState,
                    displayName: relation.viewState.displayName + ' (Copy)'
                },
                source: newSource
            }
            showRelation(newRelation);
        }

    }

    // show a list of the tables, have a light grey background
    return (

        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="p-4 pt-3 pb-2 flex flex-row items-center justify-between">
                <H5 className="text-primary text-nowrap">Editor</H5>
                <Button disabled variant={'ghost'} size={'icon'} className={'h-8'}>
                    <Plus size={20}/>
                </Button>
            </div>
            <div className="overflow-y-auto h-full">
                <TreeExplorer
                    tree={relationTreeElements}
                    iconFactory={defaultIconFactory}
                    onClick={onTreeElementClick}
                    contextMenuFactory={(path, tree) => ContextMenuFactory(path, tree, onDelete, onRename, onDuplicate)}
                />
            </div>
            <RenameDialog
                title={'Rename Relation'}
                description={'Enter a new name for the relation'}
                isOpen={renameState.isOpen}
                onOpenChange={(isOpen) => setRenameState({...renameState, isOpen})}
                onRename={onRenameConfirmed}
                currentName={renameState.currentName || ''}
            />
            <DeleteDialog
                title={deleteState.title}
                description={deleteState.description}
                isOpen={deleteState.isOpen}
                onOpenChange={(isOpen) => setDeleteState({...deleteState, isOpen})}
                onDelete={onDeleteConfirmed}
            />
        </div>
    )
}

function ContextMenuFactory(
    path: string[],
    tree: TreeNode,
    onDelete: (tree: TreeNode) => void,
    onRename: (tree: TreeNode) => void,
    onDuplicate: (tree: TreeNode) => void
) {

    return (
        <>
            <ContextMenuItem onClick={() => onRename(tree)}>
                <PencilLine size={16} className="mr-2"/>
                <span>Rename</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete(tree)}>
                <Trash size={16} className="mr-2"/>
                <span>Delete</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDuplicate(tree)}>
                <Copy size={16} className="mr-2"/>
                <span>Duplicate</span>
            </ContextMenuItem>
        </>
    );
}
