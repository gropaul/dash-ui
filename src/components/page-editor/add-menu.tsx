'use client';

import React, {createContext, ReactNode, useContext, useState} from "react";
import {ChevronDown, FileText, LucideIcon, Minus} from "lucide-react";
import {KEYS, SlateEditor, TElement} from "platejs";
import {useEditorRef} from "platejs/react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Popover, PopoverAnchor, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator} from "@/components/ui/command";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {RelationViewType} from "@/model/relation-view-state";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {VIEW_MODES} from "@/components/relation/settings/view-mode-picker";
import {BLOCK_TYPES, createBlock} from "@/components/page-editor/block-types";
import {createRelationBlock, uniqueBlockName} from "@/components/page-editor/model";
import {createPageLink, PageLinksContext} from "@/components/page-editor/page-link-context";

// A query that runs anywhere, to be replaced by the user; the same placeholder RelationActions.create uses for charts.
const NEW_BLOCK_SQL = 'SELECT range AS x, x * x AS y FROM range(-10, 11)';

// The fence header a new data block of each view starts with.
const NEW_BLOCK_HEADERS: Partial<Record<RelationViewType, Record<string, string>>> = {
    table: {view: 'table'},
    chart: {view: 'bar', x: 'x', y: 'y'},
    text: {view: 'text'},
    select: {view: 'select', column: 'x'},
    slider: {view: 'slider'},
};

export interface AddMenuEntry {
    label: string;
    icon: LucideIcon;
    onSelect: () => void;
}

/** Entries the page's host adds to every add menu's data blocks, e.g. picking a relation of the project. */
export const AddMenuExtraContext = createContext<((insert: (node: TElement) => void) => AddMenuEntry[]) | undefined>(undefined);

export type BlockKind = 'data' | 'text';

export interface BlockMenuItem {
    label: string;
    icon: ReactNode;
    onSelect: () => void;
    /** The type the block has now, when changing it. */
    active?: boolean;
    /** False shows the item as coming soon. */
    ready?: boolean;
}

const iconOf = (Icon: LucideIcon) => <Icon size={16}/>;

/**
 * The block menu: a searchable list of blocks with a fixed height that scrolls. Adding a block offers every kind;
 * changing a block's type offers its own kind only, with the current type marked.
 */
function BlockMenu({items, links = [], onPick}: {
    items: Partial<Record<BlockKind, BlockMenuItem[]>>,
    links?: BlockMenuItem[],
    onPick: () => void,
}) {
    // Closed first, so the editor can take the focus the inserted block gets.
    const select = (onSelect: () => void) => {
        onPick();
        onSelect();
    };
    const group = (heading: string, entries: BlockMenuItem[]) => (
        <CommandGroup heading={heading}>
            {entries.map(item => (
                <CommandItem key={item.label} value={`${heading}: ${item.label}`} disabled={item.ready === false}
                             onSelect={() => select(item.onSelect)} className={cn(item.active && "bg-accent")}>
                    <span className="mr-2">{item.icon}</span>{item.label}
                    {item.ready === false && <span className="ml-auto text-xs text-muted-foreground">soon</span>}
                </CommandItem>
            ))}
        </CommandGroup>
    );
    const groups = [
        items.data && group('Data', items.data),
        items.text && group('Text', items.text),
        links.length > 0 && group('Link to a page', links),
    ].filter(Boolean);

    return (
        <Command>
            <CommandInput placeholder="Add a block…"/>
            {/* Fixed while adding, so the menu keeps its size as a search narrows it. */}
            <CommandList className={cn(Object.keys(items).length > 1 && "h-72 max-h-72")}>
                <CommandEmpty>No matching block.</CommandEmpty>
                {groups.map((g, i) => <React.Fragment key={i}>{i > 0 && <CommandSeparator/>}{g}</React.Fragment>)}
            </CommandList>
        </Command>
    );
}

function newDataItems(editor: SlateEditor, insert: (node: TElement) => void, extra: AddMenuEntry[]): BlockMenuItem[] {
    return [
        ...VIEW_MODES.map(({viewType, label, ready}) => ({
            label,
            icon: defaultIconFactory(viewType),
            ready,
            onSelect: () => insert(createRelationBlock(
                NEW_BLOCK_SQL, NEW_BLOCK_HEADERS[viewType] ?? {view: viewType}, undefined, uniqueBlockName(editor, viewType),
            )),
        })),
        ...extra.map(({label, icon, onSelect}) => ({label, icon: iconOf(icon), onSelect})),
    ];
}

function newTextItems(insert: (node: TElement) => void): BlockMenuItem[] {
    return [
        ...BLOCK_TYPES.map(({key, label, icon}) => ({label, icon: iconOf(icon), onSelect: () => insert(createBlock(key))})),
        {label: 'Divider', icon: iconOf(Minus), onSelect: () => insert(createBlock(KEYS.hr))},
    ];
}

/** The block menu for adding a block. A link to a page is inline: placed at the cursor, or with `wrapInline` as a line of its own. */
function AddMenuList({insert, onPick, wrapInline = false}: {
    insert: (node: TElement) => void,
    onPick: () => void,
    wrapInline?: boolean,
}) {
    const editor = useEditorRef();
    const extra = useContext(AddMenuExtraContext);
    const pageLinks = useContext(PageLinksContext);
    const insertLink = (link: TElement) => insert(wrapInline ? {type: KEYS.p, children: [{text: ''}, link, {text: ''}]} : link);
    const links = (pageLinks?.pages() ?? []).map(page => ({
        label: page.name,
        icon: iconOf(FileText),
        onSelect: () => insertLink(createPageLink(page)),
    }));
    const items = {data: newDataItems(editor, insert, extra?.(insert) ?? []), text: newTextItems(insert)};
    return <BlockMenu items={items} links={links} onPick={onPick}/>;
}

/** The button of a block's bar that changes its type, showing the current one: the block menu for the block's kind. */
export function BlockTypeButton({icon, kind, items}: { icon: ReactNode, kind: BlockKind, items: BlockMenuItem[] }) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <TooltipWrapper message="Turn into">
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex h-10 w-14 flex-row items-center justify-center rounded-[0px]">
                        {icon}
                        <ChevronDown className="h-2 w-2"/>
                    </Button>
                </PopoverTrigger>
            </TooltipWrapper>
            <PopoverContent align="start" className="w-64 p-0" onCloseAutoFocus={e => e.preventDefault()}>
                <BlockMenu items={{[kind]: items}} onPick={() => setOpen(false)}/>
            </PopoverContent>
        </Popover>
    );
}

interface AddMenuProps {
    /** The button that opens the menu. */
    children: ReactNode;
    /** Places the chosen block. */
    insert: (node: TElement) => void;
    align?: 'start' | 'center' | 'end';
    onOpenChange?: (open: boolean) => void;
}

/** The add menu, opened by a button. */
export function AddMenu({children, insert, align = 'center', onOpenChange}: AddMenuProps) {
    const [open, setOpen] = useState(false);
    const setOpenState = (next: boolean) => {
        setOpen(next);
        onOpenChange?.(next);
    };

    return (
        <Popover open={open} onOpenChange={setOpenState}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent align={align} className="w-64 p-0" onCloseAutoFocus={e => e.preventDefault()}>
                <AddMenuList insert={insert} onPick={() => setOpenState(false)} wrapInline/>
            </PopoverContent>
        </Popover>
    );
}

/** The add menu at a spot on the screen, e.g. the cursor where `/` was typed; `onClose` says whether a block was picked. */
export function AddMenuAt({rect, insert, onClose}: {
    rect: DOMRect,
    insert: (node: TElement) => void,
    onClose: (picked: boolean) => void,
}) {
    return (
        <Popover open onOpenChange={open => !open && onClose(false)}>
            <PopoverAnchor asChild>
                <div className="pointer-events-none fixed" style={{left: rect.left, top: rect.top, width: 1, height: rect.height}}/>
            </PopoverAnchor>
            <PopoverContent align="start" className="w-64 p-0" onCloseAutoFocus={e => e.preventDefault()}>
                <AddMenuList insert={insert} onPick={() => onClose(true)}/>
            </PopoverContent>
        </Popover>
    );
}
