'use client';

import {useEffect, useMemo, useRef, useState} from "react";
import {Command as CommandPrimitive} from "cmdk";
import commandScore from "command-score";
import {Folder, FileText, Search, Sheet} from "lucide-react";
import {CommandDialog, CommandEmpty, CommandItem, CommandList} from "@/components/ui/command";
import {CommandButton} from "@/components/ui/command-button";
import {FilterTags, hasVisibleFilterTags} from "@/components/basics/filter-tags";
import {FILE_FILTER_TAGS} from "@/components/basics/files/file-filter-tags";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {fileIconType} from "@/components/workspace/file-icon";
import {newFile, NewFileKind} from "@/components/workspace/file-actions";
import {CommandActionType, CommandFile, useGUIState} from "@/state/gui.state";
import {useFilePaths, useWorkspace} from "@/state/workspace/workspace.state";
import {useFileStats} from "@/state/workspace/file-stats.state";
import {useProjectsState} from "@/state/projects.state";
import {displayName, kindOf} from "@/state/workspace/workspace-tree";
import {parentOf} from "@/state/workspace/paths";
import {DashNavigator} from "@/state/routing/navigation";
import {formatRelativeTime} from "@/platform/string-utils";

function actionLabel(action: CommandActionType): string {
    switch (action) {
        case 'open':
            return 'Open';
        case 'add-query-to-page':
            return 'Add to page';
        case 'move':
            return 'Move to';
    }
}

const KIND_LABELS: Record<CommandFile['kind'], string> = {folder: 'Folder', page: 'Page', query: 'Query'};

/** Every folder and every page and query of the workspace. */
function workspaceEntries(paths: string[], dirs: Set<string>): CommandFile[] {
    const entries: CommandFile[] = [...dirs].map(path => ({path, name: displayName(path, 'folder'), kind: 'folder'}));
    for (const path of paths) {
        const kind = kindOf(path);
        if (kind === 'page' || kind === 'query') entries.push({path, name: displayName(path, kind), kind});
    }
    return entries;
}

// Quick-create row shown in "open" mode: create a query, page or folder at the root.
function CreateEntitySlot() {
    const close = useGUIState((s) => s.closeCommand);
    const create = (kind: NewFileKind) => () => {
        close();
        newFile(kind);
    };
    return (
        <div className="flex w-full gap-2.5">
            <CommandButton className="flex-1" icon={<Sheet size={16}/>} onClick={create('query')}>New Query</CommandButton>
            <CommandButton className="flex-1" icon={<FileText size={16}/>} onClick={create('page')}>New Page</CommandButton>
            <CommandButton className="flex-1" icon={<Folder size={16}/>} onClick={create('folder')}>New Folder</CommandButton>
        </div>
    );
}

/**
 * Open the palette in "open" mode: pick a page or query and open it. Shared by the AppBar search field, the ⌘K
 * shortcut and the double-Shift shortcut. A folder opens in the file tree.
 */
export function openSearchCommand() {
    useGUIState.getState().openCommand({
        action: 'open',
        filter: ['page', 'query'],
        slot: <CreateEntitySlot/>,
        onSelect: (file) => DashNavigator.instance().navigateToPath(file.path),
    });
}

/**
 * The single global command palette / file picker. Mounted once at the app root; driven by `gui.state.command`.
 * Lists the workspace's files and folders (optionally filtered by kind) and hands the chosen one back to the
 * caller-supplied `onSelect`.
 */
export function GlobalCommand() {
    const command = useGUIState((s) => s.command);
    const closeCommand = useGUIState((s) => s.closeCommand);

    const paths = useFilePaths();
    const dirs = useWorkspace((s) => s.dirs);
    const projectId = useProjectsState((s) => s.currentProjectId);
    const stats = useFileStats((s) => s.stats[projectId]);

    const tags = FILE_FILTER_TAGS;
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

    // Flat, searchable list of the workspace's entries, filtered by kind, most-recently-viewed first.
    const items = useMemo(() => {
        const {filter, exclude} = command;
        const sorted = workspaceEntries(paths, dirs)
            .filter((file) => (!filter || filter.includes(file.kind)) && !exclude?.(file))
            .map((file) => {
                const folder = parentOf(file.path);
                // `label` is what we fuzzy-score: the path, so a folder's name finds what is in it.
                return {file, folder, label: file.path, lastViewedAt: stats?.[file.path]?.lastViewedAt};
            })
            .sort((a, b) => (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0));
        const top: CommandFile = {path: '', name: 'Top level', kind: 'folder'};
        return command.includeTopLevel && !exclude?.(top)
            ? [{file: top, folder: '', label: top.name, lastViewedAt: undefined}, ...sorted]
            : sorted;
    }, [paths, dirs, stats, command.filter, command.exclude, command.includeTopLevel]);

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
    const nodes = searchedItems.map((i) => i.file);
    const tagEntry = tags.find((t) => t.key === activeTag);
    const activeTagEntry = tagEntry && nodes.some(tagEntry.predicate) ? tagEntry : undefined;
    const visibleItems = activeTagEntry ? searchedItems.filter((i) => activeTagEntry.predicate(i.file)) : searchedItems;

    function handleSelect(file: CommandFile) {
        command.onSelect?.(file);
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
                {visibleItems.map(({file, folder, lastViewedAt}) => (
                    <CommandItem
                        // The top level's path is ''; cmdk needs a value.
                        key={file.path || '/'}
                        value={file.path || '/'}
                        onSelect={() => handleSelect(file)}
                        className="gap-2.5 rounded-md px-3 py-2.5 text-sm"
                    >
                        <ColoredIcon type={fileIconType(file)}/>
                        <span className="shrink-0 truncate max-w-[45%]">{file.name}</span>
                        <span className="flex-1 truncate text-xs text-muted-foreground">{folder}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {KIND_LABELS[file.kind]}
                        </span>
                        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {formatRelativeTime(lastViewedAt, "—")}
                        </span>
                    </CommandItem>
                ))}
            </CommandList>
        </CommandDialog>
    );
}
