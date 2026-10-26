'use client';

import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {DndProvider} from "react-dnd";
import {HTML5Backend} from "react-dnd-html5-backend";
import {Columns2, Eye, LucideIcon, Pencil} from "lucide-react";
import {KEYS, Path, Point, RangeApi, TElement} from "platejs";
import {Plate, PlateContainer, PlateContent, usePlateEditor} from "platejs/react";
import {MarkdownPlugin} from "@platejs/markdown";
import {cn} from "@/lib/utils";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {useGUIState} from "@/state/gui.state";
import {registerPendingEdits} from "@/state/workspace/pending-edits";
import {SqlEditor} from "@/components/basics/sql-editor/sql-editor";
import {EMPTY_LINE_PLACEHOLDER, PAGE_EDITOR_PLUGINS} from "@/components/page-editor/editor-plugins";
import {BlockHoverPlugin, onEditorMouseOver} from "@/components/page-editor/block-hover";
import {focusEnd, insertAtSlash} from "@/components/page-editor/block-moves";
import {AddMenuAt, AddMenuEntry, AddMenuExtraContext} from "@/components/page-editor/add-menu";
import {CooldownIndicator} from "@/components/page-editor/use-cooldown";
import {useMarkdownSync} from "@/components/page-editor/use-markdown-sync";
import {RelationFullscreenDialog} from "@/components/page-editor/relation-fullscreen-dialog";
import {renameBlock, useRelationLinks} from "@/components/page-editor/use-relation-links";
import {PagePathPlugin} from "@/components/page-editor/block-relation";
import {RelationState} from "@/model/relation-state";
import {RenameRelationContext} from "@/components/relation/common/rename-relation-context";
import {askForName} from "@/components/workspace/name-dialog";
import {blockNamesOf} from "@/state/workspace/page-text";
import {queryByName} from "@/state/workspace/file-references";
import {useWorkspace} from "@/state/workspace/workspace.state";

export type PageEditorMode = 'edit' | 'view' | 'split';

const MODES: { mode: PageEditorMode, label: string, icon: LucideIcon }[] = [
    {mode: 'split', label: 'Edit next to the markdown', icon: Columns2},
    {mode: 'edit', label: 'Edit', icon: Pencil},
    {mode: 'view', label: 'View', icon: Eye},
];

// A block's name is what other blocks write in refs.<name>(), so it must be one as it stands.
const BLOCK_NAME = /^[a-z_][a-z0-9_]*$/;

export interface PageEditorProps {
    /** The page's file; blocks are keyed by it and resolve their `-- input:` paths from it. */
    path: string;
    /** The page. A change from outside (not one the editor reported) is applied to the open page. */
    markdown: string;
    /** Called with the page's markdown whenever its content changed, from the view or the text. */
    onMarkdownChange?: (markdown: string) => void;
    /** Entries at the top of every add menu; `insert` places the chosen block. */
    addMenuExtra?: (insert: (node: TElement) => void) => AddMenuEntry[];
    /** The mode, when the host keeps it (e.g. in the URL); otherwise the editor keeps it itself. */
    mode?: PageEditorMode;
    onModeChange?: (mode: PageEditorMode) => void;
}

/** A page as one markdown document: text and relation blocks, edited as blocks, read-only, or next to its markdown. */
export function PageEditor({path, markdown, onMarkdownChange, addMenuExtra, mode: modeProp, onModeChange}: PageEditorProps) {
    const [ownMode, setOwnMode] = useState<PageEditorMode>('edit');
    const mode = modeProp ?? ownMode;
    const readOnly = mode === 'view';
    const markdownSize = useGUIState(s => Math.round(s.pageMarkdownRatio * 100));

    const editor = usePlateEditor({
        plugins: PAGE_EDITOR_PLUGINS,
        value: (e) => e.getApi(MarkdownPlugin).markdown.deserialize(markdown),
    });
    useRelationLinks(path);
    // Before the blocks render, which key their state by it.
    useLayoutEffect(() => {
        editor.setOption(PagePathPlugin, 'path', path);
    }, [editor, path]);

    const renameBlockOf = useCallback((relation: RelationState) => askForName({
        title: 'Rename block',
        initial: relation.viewState.displayName,
        submitLabel: 'Rename',
        validate: name => !BLOCK_NAME.test(name) ? 'A block name is a lowercase SQL identifier, e.g. sales_by_region.'
            : name !== relation.viewState.displayName && blockNamesOf(useWorkspace.getState().files[path] ?? '').has(name)
                ? `Another block on the page is named ${name}.`
                : queryByName(useWorkspace.getState().files, name) ? `A query is named ${name}.` : undefined,
        onSubmit: name => renameBlock(editor, path, relation.id, name),
    }), [editor, path]);
    const sync = useMarkdownSync(editor, onMarkdownChange);
    const flushAll = useRef(sync.flushAll);
    flushAll.current = sync.flushAll;
    useEffect(() => registerPendingEdits(() => flushAll.current()), []);
    useEffect(() => sync.applyExternal(markdown), [markdown]); // eslint-disable-line react-hooks/exhaustive-deps

    // Typing `/` at the start of a line or after a space, or `[[` anywhere, opens the add menu at the cursor;
    // `at` and `length` are the typed characters, which go once a block is picked.
    const [slash, setSlash] = useState<{ at: Point, length: number, rect: DOMRect } | null>(null);
    const onKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key !== '/' && e.key !== '[') || readOnly || !editor.selection || !RangeApi.isCollapsed(editor.selection)) return;
        const at = editor.selection.anchor;
        const block = editor.api.block({at});
        if (!block || block[0].type === KEYS.codeLine) return;
        const before = editor.api.string({anchor: editor.api.start(block[1])!, focus: at});
        const typed = e.key === '/' ? (!before || /\s$/.test(before)) && {at, length: 1}
            : before.endsWith('[') && at.offset > 0 && {at: {...at, offset: at.offset - 1}, length: 2};
        if (!typed) return;
        // Once the character is in, so the cursor has a place on the screen even on an empty line.
        requestAnimationFrame(() => {
            const selection = window.getSelection();
            if (selection?.rangeCount) setSlash({...typed, rect: selection.getRangeAt(0).getBoundingClientRect()});
        });
    };
    const closeSlash = (picked: boolean) => {
        setSlash(null);
        if (picked || !slash) return;
        editor.tf.select({...slash.at, offset: slash.at.offset + slash.length});
        editor.tf.focus();
    };

    const changeMode = (next: PageEditorMode) => {
        sync.flushAll();
        sync.openText();
        setOwnMode(next);
        onModeChange?.(next);
    };

    // A click (not a drag, which selects blocks) in the empty space below the last block of the page, or of a
    // column, puts the cursor at the end of it (see focusEnd).
    const pressBelow = useRef<{ x: number, y: number, containerPath: Path } | null>(null);
    const onContainerMouseDown = (e: React.MouseEvent) => {
        pressBelow.current = null;
        if (readOnly) return;
        const target = e.target as HTMLElement;
        const node = target.dataset.slateNode === 'element' ? editor.api.toSlateNode(target) : undefined;
        const containerPath = node?.type === KEYS.column ? editor.api.findPath(node)
            : e.target === e.currentTarget || target.dataset.slateEditor === 'true' ? [] : undefined;
        if (!containerPath) return;
        const children = containerPath.length ? (node as TElement).children : editor.children;
        const last = children.at(-1);
        const lastBottom = last && editor.api.toDOMNode(last)?.getBoundingClientRect().bottom;
        if (lastBottom !== undefined && e.clientY > lastBottom) pressBelow.current = {x: e.clientX, y: e.clientY, containerPath};
    };
    const onContainerMouseUp = (e: React.MouseEvent) => {
        const press = pressBelow.current;
        pressBelow.current = null;
        if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) <= 4) focusEnd(editor, press.containerPath);
    };

    const content = (
        // Plate only starts a selection on the content or on elements marked selectable, not on the bare container.
        <PlateContainer data-plate-selectable="true"
                        onMouseDown={onContainerMouseDown}
                        onMouseUp={onContainerMouseUp}
                        className={cn(
                            // Plate positions the selection rectangle absolutely inside this container.
                            "relative min-h-full",
                            "[&_.slate-selection-area]:z-50 [&_.slate-selection-area]:rounded-sm",
                            "[&_.slate-selection-area]:border [&_.slate-selection-area]:border-primary/40 [&_.slate-selection-area]:bg-primary/10",
                        )}>
            {/* The bottom padding lets the page scroll the last block up from the bottom edge. */}
            {/* Slate fades its placeholder with an inline opacity; it takes the empty line hint's colour instead. */}
            <PlateContent className={cn(
                              "mx-auto max-w-5xl px-12 pt-8 pb-[40vh] text-foreground outline-none",
                              "[&_[data-slate-placeholder]]:!opacity-100 [&_[data-slate-placeholder]]:text-muted-foreground/50",
                          )}
                          placeholder={readOnly ? undefined : EMPTY_LINE_PLACEHOLDER}
                          onFocus={sync.textToView.flush}
                          onKeyDown={onKeyDown}
                          onMouseOver={e => onEditorMouseOver(editor, e.target)}
                          onMouseLeave={() => editor.setOption(BlockHoverPlugin, 'hoveredId', null)}/>
        </PlateContainer>
    );

    return (
        <DndProvider backend={HTML5Backend}>
            <RenameRelationContext.Provider value={renameBlockOf}>
            <AddMenuExtraContext.Provider value={addMenuExtra}>
                <Plate editor={editor} readOnly={readOnly} onValueChange={sync.onValueChange}>
                    <div className="relative flex h-full w-full flex-col bg-background">
                        {/* Changing the mode first applies the text still on its way. */}
                        <div className="absolute right-4 top-4 z-40 rounded-lg border bg-background/90 p-0.5 shadow-sm backdrop-blur"
                             onPointerDownCapture={sync.textToView.flush}>
                            <ToggleGroup type="single" size="sm" value={mode}
                                         onValueChange={(value) => value && changeMode(value as PageEditorMode)}>
                                {MODES.map(({mode, label, icon: Icon}) => (
                                    <TooltipWrapper key={mode} message={label}>
                                        <ToggleGroupItem value={mode} aria-label={label}><Icon className="h-4 w-4"/></ToggleGroupItem>
                                    </TooltipWrapper>
                                ))}
                            </ToggleGroup>
                        </div>
                        {mode === 'split' ? (
                            <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
                                <ResizablePanel defaultSize={markdownSize} minSize={20}
                                                onResize={size => useGUIState.getState().setPageMarkdownRatio(size / 100)}>
                                    <div className="relative flex h-full flex-col"
                                         onFocusCapture={sync.viewToText.flush}
                                         onPointerDownCapture={sync.viewToText.flush}>
                                        <CooldownIndicator pending={sync.viewToText.pending}/>
                                        <div className="min-h-0 flex-1">
                                            <SqlEditor
                                                embedded
                                                language="markdown"
                                                displayCode={sync.text}
                                                onCodeChange={sync.onTextChange}
                                                showLineNumbers
                                                height="100%"
                                                width="100%"
                                            />
                                        </div>
                                        {sync.parseError && <div className="border-t px-3 py-1 text-xs text-destructive">{sync.parseError}</div>}
                                    </div>
                                </ResizablePanel>
                                <ResizableHandle/>
                                <ResizablePanel defaultSize={100 - markdownSize}>
                                    <div className="relative h-full" onPointerDownCapture={sync.textToView.flush}>
                                        <CooldownIndicator pending={sync.textToView.pending}/>
                                        <div className="h-full overflow-auto">{content}</div>
                                    </div>
                                </ResizablePanel>
                            </ResizablePanelGroup>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-auto">{content}</div>
                        )}
                    </div>
                    <RelationFullscreenDialog/>
                    {slash && <AddMenuAt rect={slash.rect} insert={node => insertAtSlash(editor, slash.at, node, slash.length)} onClose={closeSlash}/>}
                </Plate>
            </AddMenuExtraContext.Provider>
            </RenameRelationContext.Provider>
        </DndProvider>
    );
}
