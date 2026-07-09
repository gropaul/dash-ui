'use client';

import {Plus} from "lucide-react";
import {TreeNode, findPathById} from "@/components/basics/files/tree-utils";
import {ColoredIcon, defaultIconFactory} from "@/components/basics/files/icon-factories";
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
import {ViewPadding} from "@/components/ui/view-padding";

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
    const relations = useRelationsState((state) => state.relations);

    const children: TreeNode[] = folderNode ? (folderNode.children ?? []) : editorElements;
    const macroNames = computeSiblingMacroNames(children);

    // Id-path used by the create dialogs (they address the tree by node ids).
    const createPath = folderNode ? (findPathById(editorElements, folderNode.id) ?? []) : [];
    const title = folderNode ? folderNode.name : "Workspace";

    if (!folderNode && children.length === 0) {
        return <GetStartedPage/>;
    }

    // "New" menu, styled like the dashboard's Edit button (outline, small), shown at the
    // right of the header.
    const newButton = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1" aria-label="New">
                    <Plus size={14}/> New
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openCreateRelationDialog(createPath)}>{defaultIconFactory("relation")}Query</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateDashboardDialog(createPath)}>{defaultIconFactory("dashboard")}Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateCanvasDialog(createPath)}>{defaultIconFactory("canvas")}Canvas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateFolderDialog(createPath, folderNode)}>{defaultIconFactory("folder")}Folder</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <ViewPadding active className=" h-full flex flex-col">
            <ViewHeader title={title} actionButtons={newButton}/>
            <div className="flex-1 overflow-auto">
                {children.length === 0 ? (
                    <div className="text-muted-foreground text-sm">This folder is empty.</div>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {children.map((child) => {
                            const to = routeForSegments([...segments, macroNames.get(child.id) ?? slugify(child.name)]);
                            // Relations are colored by their view type (matching the canvas nodes);
                            // other entities by their type.
                            const iconType = child.type === "relations"
                                ? (relations[child.id]?.viewState.selectedView ?? "relations")
                                : child.type;
                            return (
                                <li key={child.id}>
                                    <a
                                        href={to}
                                        onClick={onNavClick(to)}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted text-sm text-foreground"
                                    >
                                        <ColoredIcon type={iconType}/>
                                        <span className="truncate">{child.name}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </ViewPadding>
    );
}
