'use client';

import React, {useLayoutEffect, useState} from "react";
import {Plus} from "lucide-react";
import {TElement} from "platejs";
import {AddMenu} from "@/components/page-editor/add-menu";
import {cn} from "@/lib/utils";

// The strip sits at most this far below a block's content, so under a short chart next to a tall one it stays close.
const MAX_STRIP_OFFSET_PX = 12;
// The strip is h-3, centred on its position.
const STRIP_HALF_HEIGHT_PX = 6;

/** The first element below `block` in the page; inside a column that is the block after the whole row. */
function blockBelow(block: HTMLElement) {
    const bottom = block.getBoundingClientRect().bottom;
    for (let el: HTMLElement | null = block; el && !el.hasAttribute('data-slate-editor'); el = el.parentElement) {
        for (let sibling = el.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
            // Skips what sits beside it: the next column, the column dividers.
            if (sibling.getBoundingClientRect().top >= bottom - 1) return sibling;
        }
    }
}

/** The block's own element in a block wrapper (or the element itself), whose padding is spacing, not content. */
function slateElementOf(el: Element) {
    return el.matches('[data-slate-node="element"]') ? el : el.querySelector('[data-slate-node="element"]') ?? el;
}

function padding(el: Element, side: 'paddingTop' | 'paddingBottom') {
    return parseFloat(getComputedStyle(slateElementOf(el))[side]) || 0;
}

/**
 * Where the add strip goes, relative to the block's bottom edge: halfway between where its content ends and
 * where the next block's content starts, so every kind of block gets the same spacing whatever its padding.
 */
function stripOffset(block: HTMLElement) {
    const blockBottom = block.getBoundingClientRect().bottom;
    const next = blockBelow(block);
    // Nothing below: the strip goes right under the block, clear of whatever sits on the block's bottom edge.
    if (!next) return STRIP_HALF_HEIGHT_PX;
    const contentEnd = blockBottom - padding(block, 'paddingBottom');
    const nextStart = next.getBoundingClientRect().top + padding(next, 'paddingTop');
    return contentEnd + Math.min(Math.max(nextStart - contentEnd, 0) / 2, MAX_STRIP_OFFSET_PX) - blockBottom;
}

/** A line with a + in the gap below a hovered block, like the column divider; adds a block right below it. */
export function AddBelow({visible, anchorRef, onInsert}: {
    visible: boolean,
    anchorRef: React.RefObject<HTMLDivElement | null>,
    onInsert: (node: TElement) => void,
}) {
    const [open, setOpen] = useState(false);
    const [offset, setOffset] = useState(0);
    const shown = visible || open;

    useLayoutEffect(() => {
        if (!visible) return;
        if (anchorRef.current) setOffset(stripOffset(anchorRef.current));
    }, [visible, anchorRef]);

    return (
        <div contentEditable={false}
             style={{top: `calc(100% + ${offset}px)`}}
             className={cn(
                 "absolute inset-x-0 z-20 h-3 -translate-y-1/2 select-none transition-opacity",
                 shown ? "opacity-100" : "pointer-events-none opacity-0",
             )}>
            <AddMenu insert={onInsert} onOpenChange={setOpen}>
                <button aria-label="Add a block below"
                        className="flex h-full w-full items-center gap-2 text-muted-foreground outline-none hover:text-foreground">
                    <div className="h-px flex-1 bg-border"/>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border bg-background">
                        <Plus className="h-3 w-3"/>
                    </span>
                    <div className="h-px flex-1 bg-border"/>
                </button>
            </AddMenu>
        </div>
    );
}
