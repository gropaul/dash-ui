import React from "react";
import {Copy, FolderInput, LayoutDashboard, Link, PencilLine, Trash, Workflow} from "lucide-react";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {ContextMenuItem, ContextMenuSeparator} from "@/components/ui/context-menu";
import {DropdownMenuItem, DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import {EntityActionHandlers} from "@/components/workbench/editor-overview/use-entity-actions";

interface EntityMenuItemsProps {
    /** Which Radix menu family to render into — right-click context menu vs. click-triggered dropdown. */
    variant: 'context' | 'dropdown';
    path: string[];
    tree: TreeNode;
    handlers: EntityActionHandlers;
}

/**
 * The per-row action items, rendered into either a ContextMenu (row right-click) or a
 * DropdownMenu (kebab button). Radix uses distinct item components per menu family, so we
 * pick the right pair by `variant` and render one shared list.
 */
export function EntityMenuItems({variant, path, tree, handlers}: EntityMenuItemsProps) {
    const Item = variant === 'context' ? ContextMenuItem : DropdownMenuItem;
    const Separator = variant === 'context' ? ContextMenuSeparator : DropdownMenuSeparator;

    const isFolder = tree.type === 'folder';
    const isRelation = tree.type === 'relations';
    // Rename/Duplicate/Copy link/Delete address the entity through its editor-tree path. When the
    // entity isn't in the tree (e.g. a relation shown only inside a canvas node), those items are
    // hidden; the id-based actions (Add to Dashboard/Canvas) still work. In the folder view and
    // sidebar the path is always resolved, so nothing changes there.
    const inTree = path.length > 0;

    return (
        <>
            {inTree && (
                <>
                    <Item onClick={() => handlers.onRename(path, tree)}>
                        <PencilLine size={16} className="mr-2"/>
                        <span>Rename</span>
                    </Item>
                    <Item onClick={() => handlers.onMove(path, tree)}>
                        <FolderInput size={16} className="mr-2"/>
                        <span>Move to…</span>
                    </Item>
                    {!isFolder && (
                        <Item onClick={() => handlers.onDuplicate(path, tree)}>
                            <Copy size={16} className="mr-2"/>
                            <span>Duplicate</span>
                        </Item>
                    )}
                    {!isFolder && (
                        <Item onClick={() => handlers.onCopyLink(path, tree)}>
                            <Link size={16} className="mr-2"/>
                            <span>Copy link</span>
                        </Item>
                    )}
                </>
            )}
            {isRelation && (
                <>
                    {inTree && <Separator/>}
                    <Item onClick={() => handlers.onAddToDashboard(path, tree)}>
                        <LayoutDashboard size={16} className="mr-2"/>
                        <span>Add to Dashboard</span>
                    </Item>
                    <Item onClick={() => handlers.onAddToCanvas(path, tree)}>
                        <Workflow size={16} className="mr-2"/>
                        <span>Add to Canvas</span>
                    </Item>
                </>
            )}
            {/* Delete sits alone at the bottom, divided off from the rest. */}
            {inTree && (
                <>
                    <Separator/>
                    <Item onClick={() => handlers.onDelete(path, tree)}>
                        <Trash size={16} className="mr-2"/>
                        <span>Delete</span>
                    </Item>
                </>
            )}
        </>
    );
}
