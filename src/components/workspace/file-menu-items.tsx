import {FolderPlus, FileText, Link, PencilLine, Sheet, Trash} from "lucide-react";
import {ContextMenuItem, ContextMenuSeparator} from "@/components/ui/context-menu";
import {DropdownMenuItem, DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import {copyLink, deleteEntry, newFile, renameEntry} from "@/components/workspace/file-actions";

interface FileMenuItemsProps {
    /** Which Radix menu family to render into: a right-click context menu or a click-triggered dropdown. */
    variant: 'context' | 'dropdown';
    path: string;
    isFolder: boolean;
}

/** The actions on a file or folder of the workspace. */
export function FileMenuItems({variant, path, isFolder}: FileMenuItemsProps) {
    const Item = variant === 'context' ? ContextMenuItem : DropdownMenuItem;
    const Separator = variant === 'context' ? ContextMenuSeparator : DropdownMenuSeparator;

    return (
        <>
            {isFolder && (
                <>
                    <Item onClick={() => newFile('page', path)}>
                        <FileText size={16} className="mr-2"/>
                        <span>New page</span>
                    </Item>
                    <Item onClick={() => newFile('query', path)}>
                        <Sheet size={16} className="mr-2"/>
                        <span>New query</span>
                    </Item>
                    <Item onClick={() => newFile('folder', path)}>
                        <FolderPlus size={16} className="mr-2"/>
                        <span>New folder</span>
                    </Item>
                    <Separator/>
                </>
            )}
            <Item onClick={() => renameEntry(path)}>
                <PencilLine size={16} className="mr-2"/>
                <span>Rename</span>
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
