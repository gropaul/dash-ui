'use client';

import {useMemo, useState} from "react";
import {Folder, LayoutDashboard, Plus, Sheet, Trash2, WorkflowIcon} from "lucide-react";
import {TreeNode, findPathById} from "@/components/basics/files/tree-utils";
import {ColumnHeadSortingIcon} from "@/components/basics/column-head-sorting-icon";
import {SearchBox} from "@/components/basics/search-box";
import {FilterTag, FilterTags} from "@/components/basics/filter-tags";
import {RelationZustandEntityType} from "@/state/entities/entity-functions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {ColoredIcon, defaultIconFactory} from "@/components/basics/files/icon-factories";
import {computeSiblingMacroNames, slugify} from "@/state/routing/macro-name";
import {routeForSegments} from "@/state/routing/core-model";
import {onNavClick} from "@/state/routing/use-location";
import {useRelationsState} from "@/state/relations.state";
import {EntityBase} from "@/state/entities/entity-base";
import {GetStartedPage} from "@/components/onboarding/get-started-page";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {Button} from "@/components/ui/button";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    openCreateCanvasDialog,
    openCreateDashboardDialog,
    openCreateFolderDialog,
    openCreateRelationDialog,
} from "@/components/workbench/create-entity-dialogs";
import {ViewPadding} from "@/components/ui/view-padding";
import {formatRelativeTime} from "@/platform/string-utils";
import {formatNumber} from "@/platform/number-utils";
import {VIEW_MODES} from "@/components/relation/settings/view-mode-picker";

interface FolderViewProps {
    /** The resolved folder node, or undefined for the /workspace root. */
    folderNode?: TreeNode;
    /** Macro-name segments of the current folder (empty at root). */
    segments: string[];
}

type SortKey = "name" | "lastEditedAt" | "lastViewedAt" | "nViews";
type SortDir = "asc" | "desc";

/** One filter chip per element kind; zero-count chips collapse away in the widget. */
const TYPE_TAGS: FilterTag<TreeNode>[] = [
    {key: "folder", label: "Folders", icon: <Folder size={12}/>, predicate: (n) => n.type === "folder"},
    {key: "relations", label: "Queries", icon: <Sheet size={12}/>, predicate: (n) => n.type === "relations"},
    {
        key: "dashboards",
        label: "Dashboards",
        icon: <LayoutDashboard size={12}/>,
        predicate: (n) => n.type === "dashboards"
    },
    {key: "canvas", label: "Canvases", icon: <WorkflowIcon size={12}/>, predicate: (n) => n.type === "canvas"},
];

/**
 * Metadata shown for an element. Folders carry it on their tree node; relations/dashboards/
 * canvases carry it on their collection entry (keyed by the shared id == node id).
 */
function getElementMetadata(
    node: TreeNode,
    relations: Record<string, EntityBase>,
    dashboards: Record<string, EntityBase>,
    canvas: Record<string, EntityBase>,
): Partial<EntityBase> {
    switch (node.type) {
        case "relations":
            return relations[node.id] ?? {};
        case "dashboards":
            return dashboards[node.id] ?? {};
        case "canvas":
            return canvas[node.id] ?? {};
        default:
            // folder nodes store metadata on the tree node itself
            return node as Partial<EntityBase>;
    }
}

/** Comparator that always sorts missing values (undefined) last, regardless of direction. */
function compareMaybe(a: number | undefined, b: number | undefined, dir: SortDir): number {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;
    return dir === "asc" ? a - b : b - a;
}

/**
 * Lists the direct children of a folder (or the /workspace root) as a sortable table. Uses the
 * shared ViewHeader (same path title as the relation view); each row links to the child's
 * `/workspace/...` URL; the "New" menu creates items in this folder.
 */
export function FolderView({folderNode, segments}: FolderViewProps) {
    const editorElements = useRelationsState((state) => state.editorElements);
    const relations = useRelationsState((state) => state.relations);
    const dashboards = useRelationsState((state) => state.dashboards);
    const canvas = useRelationsState((state) => state.canvas);
    const deleteEntity = useRelationsState((state) => state.deleteEntity);
    const removeEditorElement = useRelationsState((state) => state.removeEditorElement);

    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({key: "lastViewedAt", dir: "desc"});
    const [activeTag, setActiveTag] = useState("");
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    // the element pending delete confirmation, or null when the dialog is closed
    const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null);

    const children: TreeNode[] = folderNode ? (folderNode.children ?? []) : editorElements;
    const macroNames = computeSiblingMacroNames(children);

    // Entity-kind chips (folder/query/…) plus one chip per relation view type (Table/Chart/…),
    // resolved from each relation's selectedView. Zero-count chips collapse away in the widget,
    // so only view types actually present are shown.
    const tags = useMemo<FilterTag<TreeNode>[]>(() => {
        const viewTags: FilterTag<TreeNode>[] = VIEW_MODES.map((mode) => ({
            key: `view:${mode.viewType}`,
            label: mode.label,
            icon: <span className="[&_svg]:size-3">{defaultIconFactory(mode.viewType)}</span>,
            predicate: (n) => n.type === "relations" && relations[n.id]?.viewState?.selectedView === mode.viewType,
        }));
        return [...TYPE_TAGS, ...viewTags];
    }, [relations]);

    // an active tag whose count dropped to zero (e.g. after navigating) no longer filters
    const tagEntry = tags.find((t) => t.key === activeTag);
    const activeTagEntry = tagEntry && children.some(tagEntry.predicate) ? tagEntry : undefined;

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
                <DropdownMenuItem
                    onClick={() => openCreateRelationDialog(createPath)}>{defaultIconFactory("relation")}Query</DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => openCreateDashboardDialog(createPath)}>{defaultIconFactory("dashboard")}Dashboard</DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => openCreateCanvasDialog(createPath)}>{defaultIconFactory("canvas")}Canvas</DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => openCreateFolderDialog(createPath, folderNode)}>{defaultIconFactory("folder")}Folder</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    // Build rows with their resolved link, icon and metadata, then sort.
    const query = search.trim().toLowerCase();
    const visibleChildren = children.filter((c) => {
        if (activeTagEntry && !activeTagEntry.predicate(c)) return false;
        if (query && !c.name.toLowerCase().includes(query)) return false;
        return true;
    });
    const rows = visibleChildren.map((child) => {
        const to = routeForSegments([...segments, macroNames.get(child.id) ?? slugify(child.name)]);
        // Relations are colored by their view type (matching the canvas nodes); other entities by type.
        const iconType = child.type === "relations"
            ? (relations[child.id]?.viewState?.selectedView ?? "relations")
            : child.type;
        const meta = getElementMetadata(child, relations, dashboards, canvas);
        return {child, to, iconType, meta};
    });

    rows.sort((a, b) => {
        if (sort.key === "name") {
            const cmp = a.child.name.localeCompare(b.child.name, undefined, {sensitivity: "base"});
            return sort.dir === "asc" ? cmp : -cmp;
        }
        if (sort.key === "nViews") {
            return compareMaybe(a.meta.nViews, b.meta.nViews, sort.dir);
        }
        return compareMaybe(a.meta[sort.key], b.meta[sort.key], sort.dir);
    });

    const toggleSort = (key: SortKey) => {
        setSort((prev) =>
            prev.key === key
                ? {key, dir: prev.dir === "asc" ? "desc" : "asc"}
                // names default ascending; usage columns default descending (most recent / most viewed first)
                : {key, dir: key === "name" ? "asc" : "desc"},
        );
    };

    function confirmDelete() {
        if (!deleteTarget) return;
        const path = findPathById(editorElements, deleteTarget.id);
        if (path) {
            if (deleteTarget.type === "folder") {
                removeEditorElement(path);
            } else {
                deleteEntity(deleteTarget.type as RelationZustandEntityType, deleteTarget.id, path);
            }
        }
        setDeleteTarget(null);
    }

    const SortHeader = ({label, sortKey, className}: { label: string; sortKey: SortKey; className?: string }) => {
        const active = sort.key === sortKey;
        return (
            <TableHead className={className}>
                <button
                    type="button"
                    onClick={() => toggleSort(sortKey)}
                    className="group inline-flex items-center gap-1 hover:text-foreground"
                >
                    {label}
                    {/* Icon always visible on the active sort column; otherwise only on hover. */}
                    <ColumnHeadSortingIcon
                        sorting={active ? (sort.dir === "asc" ? "ASC" : "DESC") : undefined}
                        iconSize={13}
                    />
                </button>
            </TableHead>
        );
    };

    return (
        <ViewPadding active addPaddingBottom className=" h-full flex flex-col" classNameParent={'bg-accent'}>
            <ViewHeader title={title} actionButtons={<>{newButton}</>}/>
            <div className={'bg-card p-8 border rounded-2xl w-full h-full flex flex-col'}>
                {children.length > 0 && (
                    <div className={"flex items-center justify-between pb-2"}>
                        <FilterTags
                            tags={tags}
                            items={children}
                            activeKey={activeTag}
                            onChange={setActiveTag}
                        />
                        <SearchBox open={searchOpen} setOpen={setSearchOpen} value={search} onChange={setSearch}/>
                    </div>

                )}
                <div className="flex-1 min-h-0">
                    {children.length === 0 ? (
                        <div className="text-muted-foreground text-sm">This folder is empty.</div>
                    ) : (
                        <Table className="text-xs" containerClassName="h-full">
                            <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))] [&_tr]:border-b-0">
                                <TableRow>
                                    <SortHeader label="Name" sortKey="name"/>
                                    <SortHeader label="Last edited" sortKey="lastEditedAt" className="w-40"/>
                                    <SortHeader label="Last viewed" sortKey="lastViewedAt" className="w-40"/>
                                    <SortHeader label="Views" sortKey="nViews" className="w-20"/>
                                    <TableHead className="w-8"/>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                                            No items match.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {rows.map(({child, to, iconType, meta}) => (
                                    <TableRow
                                        key={child.id}
                                        onClick={onNavClick(to)}
                                        className="group cursor-pointer"
                                    >
                                        <TableCell>
                                            {/* href kept for middle-click / open-in-new-tab; plain clicks are
                                            handled by the row's onNavClick (bubbles up, preventing default). */}
                                            <a href={to} className="flex items-center gap-2.5 text-foreground">
                                                <ColoredIcon type={iconType}/>
                                                <span className="truncate">{child.name}</span>
                                            </a>
                                        </TableCell>
                                        <TableCell
                                            className="text-muted-foreground">{formatRelativeTime(meta.lastEditedAt, "—")}</TableCell>
                                        <TableCell
                                            className="text-muted-foreground">{formatRelativeTime(meta.lastViewedAt, "—")}</TableCell>
                                        <TableCell
                                            className="text-muted-foreground tabular-nums">{formatNumber(meta.nViews ?? 0, 1, true)}</TableCell>
                                        <TableCell className="p-0">
                                            <TooltipWrapper message="Delete">
                                                <button
                                                    type="button"
                                                    aria-label={`Delete ${child.name}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteTarget(child);
                                                    }}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            </TooltipWrapper>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {deleteTarget?.type === "folder" ? "folder" : "item"} “{deleteTarget?.name}”?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.type === "folder"
                                ? "This deletes the folder and all its contents. This action cannot be undone."
                                : "This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ViewPadding>
    );
}
