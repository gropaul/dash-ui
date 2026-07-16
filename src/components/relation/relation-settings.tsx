import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {EllipsisVertical} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationViewProps} from "@/components/relation/relation-view";
import React from "react";
import {useRelationsState} from "@/state/relations.state";
import {findPathById, TreeNode} from "@/components/basics/files/tree-utils";
import {useEntityActions} from "@/components/workbench/editor-overview/use-entity-actions";
import {EntityMenuItems} from "@/components/workbench/editor-overview/entity-menu-items";

export interface RelationSettingsProps extends RelationViewProps {
    align?: "start" | "center" | "end";
    className?: string;
    /** View-specific extras rendered above the shared entity actions (e.g. the Show Query toggle). */
    children?: React.ReactNode;
}

/**
 * The `⋮` settings menu shown on a relation (detail-view header and canvas node). Its base is the
 * same shared entity-action list used by the folder view and sidebar (Rename / Duplicate / Copy
 * link / Delete / Add to Dashboard / Add to Canvas); callers inject view-specific extras (like the
 * Show Query toggle) through `children`, rendered above that base.
 */
export function RelationSettings(props: RelationSettingsProps) {
    const editorElements = useRelationsState((state) => state.editorElements);
    // Only `handlers` are needed here: RelationSettings always acts on a relation, whose
    // rename / delete / add-to-* flows are driven by app-root global dialogs (rename dialog,
    // RelationDeleteDialog, command palette). The local DeleteDialog only serves non-relation
    // entities, so it isn't rendered per settings-menu (avoids duplicate modals per canvas node).
    const {handlers} = useEntityActions();

    const relation = props.relationState;
    const path = findPathById(editorElements, relation.id) ?? [];
    const tree: TreeNode = {
        id: relation.id,
        name: relation.viewState.displayName,
        type: 'relations',
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={props.className}>
                    <EllipsisVertical className="h-4 w-4 mr-2"/>
                    <span className="sr-only">Open settings</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align={props.align ?? "start"}>
                {props.children}
                {props.children && <DropdownMenuSeparator/>}
                <EntityMenuItems variant="dropdown" path={path} tree={tree} handlers={handlers}/>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
