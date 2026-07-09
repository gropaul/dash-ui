"use client"

import React from "react";
import {cn} from "@/lib/utils";

/**
 * A single filter chip: matches items for which `predicate` is true. Generic over
 * the item type so it works for table columns, folder-view elements, etc.
 */
export interface FilterTag<T> {
    key: string;
    label: string;
    icon?: React.ReactNode;
    predicate: (item: T) => boolean;
}

interface FilterTagsProps<T> {
    tags: FilterTag<T>[];
    /** The items the tags filter; used to compute per-tag counts. */
    items: T[];
    /** Key of the active tag, or '' when none is active. */
    activeKey: string;
    /** Called with the next active key (already toggled: '' when the active chip is clicked). */
    onChange: (key: string) => void;
    /** Extra classes on the wrapper (e.g. border/padding to match the surrounding panel). */
    className?: string;
}

/**
 * The shared filter-chip row: one rounded chip per tag with a live match count. Chips whose
 * count is zero collapse away (animated), and clicking the active chip clears the filter.
 */
export function FilterTags<T>({tags, items, activeKey, onChange, className}: FilterTagsProps<T>) {
    const counts: Record<string, number> = {};
    tags.forEach(t => {
        counts[t.key] = items.filter(t.predicate).length;
    });

    return (
        <div className={cn("flex flex-wrap gap-y-2", className)}>
            {tags.map(t => {
                const count = counts[t.key];
                const shown = count > 0;
                const active = activeKey === t.key && shown;
                return (
                    <button
                        key={t.key}
                        tabIndex={shown ? 0 : -1}
                        onClick={() => onChange(active ? '' : t.key)}
                        className={cn(
                            "inline-flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border text-xs transition-all duration-200",
                            shown
                                ? "mr-1.5 max-w-40 px-2.5 py-0.5 opacity-100"
                                : "pointer-events-none mr-0 max-w-0 border-0 p-0 opacity-0",
                            active
                                ? "border-transparent bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted",
                        )}
                    >
                        {t.icon}
                        {t.label}
                        <span className={cn(active ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
