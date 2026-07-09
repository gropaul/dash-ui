'use client';

import {Folder, LayoutDashboard, Sheet, Workflow, SquarePlus} from "lucide-react";
import {TreeNode, findPathById} from "@/components/basics/files/tree-utils";
import {defaultColorFactory} from "@/components/basics/files/icon-factories";
import {computeSiblingMacroNames, slugify} from "@/state/routing/macro-name";
import {routeForSegments} from "@/state/routing/core-model";
import {onNavClick} from "@/state/routing/use-location";
import {useRelationsState} from "@/state/relations.state";
import {GetStartedPage} from "@/components/onboarding/get-started-page";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    openCreateCanvasDialog,
    openCreateDashboardDialog,
    openCreateFolderDialog,
    openCreateRelationDialog,
} from "@/components/workbench/create-entity-dialogs";

function iconForType(type: string) {
    switch (type) {
        case "folder": return <Folder className="h-4 w-4 text-muted-foreground"/>;
        case "relations": return <Sheet className="h-4 w-4 text-muted-foreground"/>;
        case "dashboards": return <LayoutDashboard className="h-4 w-4 text-muted-foreground"/>;
        case "canvas": return <Workflow className="h-4 w-4 text-muted-foreground"/>;
        default: return <Folder className="h-4 w-4 text-muted-foreground"/>;
    }
}

interface FolderViewProps {
    /** The resolved folder node, or undefined for the /workspace root. */
    folderNode?: TreeNode;
    /** Macro-name segments of the current folder (empty at root). */
    segments: string[];
}

/**
 * Lists the direct children of a folder (or the /workspace root). Uses the shared
 * ViewHeader (same path title as the relation view); each row links to the
 * child's `/workspace/...` URL; the "New" menu creates items in this folder.
 */
export function FolderView({folderNode, segments}: FolderViewProps) {
    const editorElements = useRelationsState((state) => state.editorElements);

    const children: TreeNode[] = folderNode ? (folderNode.children ?? []) : editorElements;
    const macroNames = computeSiblingMacroNames(children);

    // Id-path used by the create dialogs (they address the tree by node ids).
    const createPath = folderNode ? (findPathById(editorElements, folderNode.id) ?? []) : [];
    const title = folderNode ? folderNode.name : "Workspace";

    if (!folderNode && children.length === 0) {
        return <GetStartedPage/>;
    }

    const titleComponent = (
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
            {folderNode ? (
                <span className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                    {folderNode.name}
                </span>
            ) : (
                <span className="font-semibold text-sm">Workspace</span>
            )}
        </div>
    );

    const newColor = defaultColorFactory("table");
    const newButton = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-sm flex-shrink-0 [&_svg]:size-auto"
                        aria-label="New" style={{color: newColor.foreground}}>
                    <SquarePlus size={28}/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => openCreateRelationDialog(createPath)}>Data View</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateDashboardDialog(createPath)}>Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateCanvasDialog(createPath)}>Canvas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateFolderDialog(createPath, folderNode)}>Folder</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={title} titleComponent={titleComponent} leadingButton={newButton}/>
            <div className="flex-1 overflow-auto p-6">
                {children.length === 0 ? (
                    <div className="text-muted-foreground text-sm">This folder is empty.</div>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {children.map((child) => {
                            const to = routeForSegments([...segments, macroNames.get(child.id) ?? slugify(child.name)]);
                            return (
                                <li key={child.id}>
                                    <a
                                        href={to}
                                        onClick={onNavClick(to)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm text-foreground"
                                    >
                                        {iconForType(child.type)}
                                        <span className="truncate">{child.name}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
