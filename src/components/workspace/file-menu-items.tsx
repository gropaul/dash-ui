import {Folder, FolderInput, FileText, Link, PencilLine, Sheet, Trash, Workflow} from "lucide-react";
import {ContextMenuItem, ContextMenuLabel, ContextMenuSeparator} from "@/components/ui/context-menu";
import {DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import {copyLink, deleteEntry, moveEntryTo, newFile, renameEntry} from "@/components/workspace/file-actions";

type MenuVariant = 'context' | 'dropdown';

// Radix uses distinct item components per menu family.
const itemsOf = (variant: MenuVariant) => variant === 'context'
    ? {Item: ContextMenuItem, Label: ContextMenuLabel, Separator: ContextMenuSeparator}
    : {Item: DropdownMenuItem, Label: DropdownMenuLabel, Separator: DropdownMenuSeparator};

/** New page, query, canvas and folder in `folder` ('' for the top level). */
export function NewFileItems({variant, folder}: { variant: MenuVariant, folder: string }) {
    const {Item, Label, Separator} = itemsOf(variant);
    return (
        <>
            <Label className="text-xs font-medium text-muted-foreground">New</Label>
            <Item onClick={() => newFile('page', folder)}>
                <FileText size={16} className="mr-2"/>
                <span>Page</span>
            </Item>
            <Item onClick={() => newFile('query', folder)}>
                <Sheet size={16} className="mr-2"/>
                <span>Query</span>
            </Item>
            <Item onClick={() => newFile('canvas', folder)}>
                <Workflow size={16} className="mr-2"/>
                <span>Canvas</span>
            </Item>
            <Separator/>
            <Item onClick={() => newFile('folder', folder)}>
                <Folder size={16} className="mr-2"/>
                <span>Folder</span>
            </Item>
        </>
    );
}

interface FileMenuItemsProps {
    /** Which Radix menu family to render into: a right-click context menu or a click-triggered dropdown. */
    variant: MenuVariant;
    path: string;
    isFolder: boolean;
}

/** The actions on a file or folder of the workspace. */
export function FileMenuItems({variant, path, isFolder}: FileMenuItemsProps) {
    const {Item, Separator} = itemsOf(variant);

    return (
        <>
            {isFolder && (
                <>
                    <NewFileItems variant={variant} folder={path}/>
                    <Separator/>
                </>
            )}
            <Item onClick={() => renameEntry(path)}>
                <PencilLine size={16} className="mr-2"/>
                <span>Rename</span>
            </Item>
            <Item onClick={() => moveEntryTo(path)}>
                <FolderInput size={16} className="mr-2"/>
                <span>Move to…</span>
            </Item>
            {!isFolder && (
                <Item onClick={() => copyLink(path)}>
                    <Link size={16} className="mr-2"/>
                    <span>Copy link</span>
                </Item>
            )}
            <Separator/>
            <Item onClick={() => deleteEntry(path)}>
                <Trash size={16} className="mr-2"/>
                <span>Delete</span>
            </Item>
        </>
    );
}
