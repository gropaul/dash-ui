'use client';

import {useEffect, useMemo, useRef, useState} from "react";
import {Command as CommandPrimitive} from "cmdk";
import commandScore from "command-score";
import {Folder, LayoutDashboard, Search, Sheet, Workflow} from "lucide-react";
import {CommandDialog, CommandEmpty, CommandItem, CommandList} from "@/components/ui/command";
import {CommandButton} from "@/components/ui/command-button";
import {FilterTags, hasVisibleFilterTags} from "@/components/basics/filter-tags";
import {useEntityFilterTags} from "@/components/basics/files/entity-filter-tags";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {
    openCreateCanvasDialog,
    openCreateDashboardDialog,
    openCreateFolderDialog,
    openCreateRelationDialog,
} from "@/components/workbench/create-entity-dialogs";
import {flattenEditorTree} from "@/state/recent/recent-items";
import {EditorFolder} from "@/model/editor-folder";
import {useGUIState, CommandActionType, CommandEntityType} from "@/state/gui.state";
import {useRelationsState} from "@/state/relations.state";
import {EntityBase} from "@/state/entities/entity-base";
import {DashNavigator} from "@/state/routing/navigation";
import {formatRelativeTime} from "@/platform/string-utils";

function actionLabel(action: CommandActionType): string {
    switch (action) {
        case 'open':
            return 'Open';
        case 'add-relation-to-dashboard':
            return 'Add to Dashboard';
        case 'add-relation-to-canvas':
            return 'Add to Canvas';
        case 'move':
            return 'Move to';
    }
}

/**
 * Maps every node to the breadcrumb of its ancestor folders (e.g. ["Workspace", "Reports"]),
 * so identically-named folders can be told apart in move mode. The node's own name is the row
 * label, so it is not included here.
 */
function buildAncestorPaths(nodes: EditorFolder[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const walk = (list: EditorFolder[], trail: string[]) => {
        for (const node of list) {
            map.set(node.id, trail);
            if (node.children) walk(node.children, [...trail, node.name]);
        }
    };
    walk(nodes, ["Workspace"]);
    return map;
}

function entityKindLabel(type: string): string {
    switch (type) {
        case 'folder':
            return 'Folder';
        case 'relations':
            return 'Query';
        case 'dashboards':
            return 'Dashboard';
        case 'canvas':
            return 'Canvas';
        default:
            return type;
    }
}

function resolveEntity(
    node: EditorFolder,
    relations: Record<string, EntityBase>,
    dashboards: Record<string, EntityBase>,
    canvas: Record<string, EntityBase>,
): EntityBase {
    switch (node.type) {
        case 'relations': return relations[node.id] ?? node;
        case 'dashboards': return dashboards[node.id] ?? node;
        case 'canvas': return canvas[node.id] ?? node;
        default: return node;
    }
}

// Quick-create row shown in "open" mode: create a Query / Dashboard / Canvas / Folder at the root.
function CreateEntitySlot() {
    const close = useGUIState((s) => s.closeCommand);
    const create = (open: (path: string[]) => void) => () => {
        open([]);
        close();
    };
    return (
        <div className="flex w-full gap-2.5">
            <CommandButton className="flex-1" icon={<Sheet size={16}/>} onClick={create(openCreateRelationDialog)}>New Query</CommandButton>
            <CommandButton className="flex-1" icon={<LayoutDashboard size={16}/>} onClick={create(openCreateDashboardDialog)}>New Dashboard</CommandButton>
            <CommandButton className="flex-1" icon={<Workflow size={16}/>} onClick={create(openCreateCanvasDialog)}>New Canvas</CommandButton>
            <CommandButton className="flex-1" icon={<Folder size={16}/>} onClick={create(openCreateFolderDialog)}>New Folder</CommandButton>
        </div>
    );
}

/**
 * Open the palette in "open" mode: pick any entity and navigate to it. Shared by the AppBar
 * search field, the ⌘K shortcut and the double-Shift shortcut.
 */
export function openSearchCommand() {
    useGUIState.getState().openCommand({
        action: 'open',
        slot: <CreateEntitySlot/>,
        onSelect: (entity: EntityBase) => {
            DashNavigator.instance().navigateToObjectId(entity.id);
        },
    });
}

/**
 * The single global command palette / entity picker. Mounted once at the app root; driven by
 * `gui.state.command`. Lists every entity in the editor tree (optionally filtered by kind),
 * and hands the chosen entity back to the caller-supplied `onSelect`.
 */
export function GlobalCommand() {
    const command = useGUIState((s) => s.command);
    const closeCommand = useGUIState((s) => s.closeCommand);

    const editorElements = useRelationsState((s) => s.editorElements);
    const relations = useRelationsState((s) => s.relations);
    const dashboards = useRelationsState((s) => s.dashboards);
    const canvas = useRelationsState((s) => s.canvas);

    const tags = useEntityFilterTags();
    const [activeTag, setActiveTag] = useState("");
    const [search, setSearch] = useState("");
    useEffect(() => {
        if (command.isOpen) {
            setActiveTag("");
            setSearch("");
        }
    }, [command.isOpen]);

    // Global shortcuts: ⌘/Ctrl-K and double-Shift both open the palette in "open" mode.
    const lastShiftRef = useRef(0);
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                openSearchCommand();
                return;
            }
            if (e.key === 'Shift') {
                if (e.repeat) return;
                const now = Date.now();
                if (now - lastShiftRef.current < 400) {
                    lastShiftRef.current = 0;
                    openSearchCommand();
                } else {
                    lastShiftRef.current = now;
                }
                return;
            }
            // any other key breaks the double-Shift sequence
            lastShiftRef.current = 0;
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // Flat, searchable list of all tree entities, filtered by kind, most-recently-accessed first.
    const items = useMemo(() => {
        const ancestorPaths = command.showPaths ? buildAncestorPaths(editorElements) : undefined;

        function toItem(node: EditorFolder) {
            const iconType = node.type === 'relations'
                ? (relations[node.id]?.viewState?.selectedView ?? 'relations')
                : node.type;
            const meta = resolveEntity(node, relations, dashboards, canvas);
            const pathLabel = ancestorPaths?.get(node.id)?.join(' / ');
            // `label` is what we fuzzy-score (human-readable, no id noise); `value` stays unique for cmdk.
            const label = `${pathLabel ? pathLabel + ' / ' : ''}${node.name}`;
            const value = `${label} ${node.id}`;
            return {node, name: node.name, iconType, typeLabel: entityKindLabel(node.type), lastViewedAt: meta.lastViewedAt, pathLabel, label, value};
        }

        const filter = command.filter;
        const exclude = command.excludeIds;
        return flattenEditorTree(editorElements)
            .filter((node) => !filter || filter.includes(node.type as CommandEntityType))
            .filter((node) => !exclude || !exclude.includes(node.id))
            .map(toItem)
            .sort((a, b) => (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0));
    }, [editorElements, relations, dashboards, canvas, command.filter, command.excludeIds, command.showPaths]);

    // The set the search leaves on screen. We own the filtering (cmdk's is disabled below) and use
    // its exact scorer — `command-score`, the same package cmdk uses — so the chip counts reflect
    // precisely the visible rows. Matches are ranked best-first, like cmdk; with no search we keep the
    // most-recently-viewed order. An active chip whose count dropped to zero no longer filters.
    const searchedItems = useMemo(() => {
        if (!search) return items;
        return items
            .map((i) => ({i, score: commandScore(i.label, search)}))
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((s) => s.i);
    }, [items, search]);
    const nodes = searchedItems.map((i) => i.node);
    const tagEntry = tags.find((t) => t.key === activeTag);
    const activeTagEntry = tagEntry && nodes.some(tagEntry.predicate) ? tagEntry : undefined;
    const visibleItems = activeTagEntry ? searchedItems.filter((i) => activeTagEntry.predicate(i.node)) : searchedItems;

    function handleSelect(node: EditorFolder) {
        command.onSelect?.(resolveEntity(node, relations, dashboards, canvas));
        closeCommand();
    }

    return (
        <CommandDialog
            open={command.isOpen}
            onOpenChange={(open) => !open && closeCommand()}
            contentClassName="sm:max-w-3xl h-[75vh] rounded-2xl flex flex-col [&>button]:hidden"
            commandProps={{shouldFilter: false}}
        >
            {/* No bottom border when a slot follows, so search + slot read as one block. */}
            <div className={`flex items-center gap-2.5 px-3 py-3 ${command.slot ? '' : 'border-b'}`}>
                <span className="flex h-10 min-w-16 shrink-0 items-center justify-center rounded-2xl bg-muted px-3 font-medium ">
                    {actionLabel(command.action)}
                </span>
                <div className="flex h-10 w-full items-center gap-2 rounded-2xl bg-muted px-3">
                    <Search className="h-4 w-4 shrink-0 opacity-50"/>
                    <CommandPrimitive.Input
                        autoFocus
                        value={search}
                        onValueChange={setSearch}
                        placeholder="Type to search…"
                        className="h-full w-full bg-transparent font-medium outline-none placeholder:text-muted-foreground"
                    />
                </div>
            </div>

            {command.slot && (
                <div className="border-b px-3 pb-3">
                    {command.slot}
                </div>
            )}

            {hasVisibleFilterTags(tags, nodes, true) && (
                <div className="border-b px-5 py-2.5">
                    <FilterTags tags={tags} items={nodes} activeKey={activeTag} onChange={setActiveTag} hideFullSet/>
                </div>
            )}

            <CommandList className="min-h-0 max-h-none flex-1 p-2">
                <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">No matches found</CommandEmpty>
                {command.rootOption && (!search || commandScore(command.rootOption.label, search) > 0) && (
                    <CommandItem
                        key="__root__"
                        value={command.rootOption.label}
                        onSelect={() => { command.rootOption!.onSelect(); closeCommand(); }}
                        className="gap-2.5 rounded-md px-3 py-2.5 text-sm"
                    >
                        <ColoredIcon type="folder"/>
                        <span className="flex-1 truncate">{command.rootOption.label}</span>
                    </CommandItem>
                )}
                {visibleItems.map(({node, name, iconType, typeLabel, lastViewedAt, pathLabel, value}) => (
                    <CommandItem
                        key={node.id}
                        value={value}
                        onSelect={() => handleSelect(node)}
                        className="gap-2.5 rounded-md px-3 py-2.5 text-sm"
                    >
                        <ColoredIcon type={iconType}/>
                        {pathLabel ? (
                            <>
                                <span className="shrink-0 truncate max-w-[55%]">{name}</span>
                                <span className="flex-1 truncate text-right text-xs text-muted-foreground">
                                    {pathLabel}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 truncate">{name}</span>
                                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                    {typeLabel}
                                </span>
                                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                    {formatRelativeTime(lastViewedAt, "—")}
                                </span>
                            </>
                        )}
                    </CommandItem>
                ))}
            </CommandList>
        </CommandDialog>
    );
}
