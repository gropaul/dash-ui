"use client"

import React from "react";
import {ChevronDown, Search} from "lucide-react";
import {cn} from "@/lib/utils";
import {Column} from "@/model/data-source-connection";
import {FilterTag, FilterTags} from "@/components/basics/filter-tags";

/**
 * The shared column-list skeleton: search + filter tags + column rows with a
 * single-open accordion editor. Modes (table, chart, ...) plug in their own
 * row decorations and editor content via render props; the list itself only
 * knows how to search, filter, and expand.
 */

/** Column-typed filter chip (see the generic {@link FilterTag}). */
export type ColumnFilterTag = FilterTag<Column>;

export interface ColumnConfigListProps {
    columns: Column[];
    filterTags?: ColumnFilterTag[];
    /** Leading control on a row, e.g. a visibility toggle. Stop propagation inside. */
    renderLeading?: (column: Column) => React.ReactNode;
    /** Type icon slot; color it to signal state (e.g. styled). */
    renderIcon: (column: Column) => React.ReactNode;
    /** The single status slot on the right, e.g. a sort-priority pill. */
    renderStatus?: (column: Column) => React.ReactNode;
    /** Accordion editor content. Rows without content are not expandable. */
    renderExpanded?: (column: Column) => React.ReactNode;
    /** Dim the row, e.g. for hidden columns. */
    isDimmed?: (column: Column) => boolean;
    /** Rendered below the list; receives the columns currently shown by search/filter. */
    renderFooter?: (shownColumns: Column[]) => React.ReactNode;
}

export function ColumnConfigList(props: ColumnConfigListProps) {
    const {columns, filterTags, renderLeading, renderIcon, renderStatus, renderExpanded, isDimmed, renderFooter} = props;

    const [query, setQuery] = React.useState('');
    const [activeTag, setActiveTag] = React.useState('');
    const [openColumn, setOpenColumn] = React.useState('');
    // stays set while the close animation runs, so the content can animate out
    const [mountedColumn, setMountedColumn] = React.useState('');
    const openIntent = React.useRef('');

    function toggleOpen(columnName: string, open: boolean) {
        if (open) {
            openIntent.current = '';
            setOpenColumn('');
            setMountedColumn(columnName);
        } else {
            // mount collapsed first, then expand a frame later so the
            // 0fr -> 1fr transition actually runs
            openIntent.current = columnName;
            setMountedColumn(columnName);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (openIntent.current === columnName) setOpenColumn(columnName);
            }));
        }
    }

    const tagCounts: Record<string, number> = {};
    filterTags?.forEach(t => {
        tagCounts[t.key] = columns.filter(t.predicate).length;
    });

    // an active tag whose count dropped to zero no longer filters (its chip is hidden)
    const activeTagEntry = filterTags?.find(t => t.key === activeTag);
    const tag = activeTagEntry && tagCounts[activeTagEntry.key] > 0 ? activeTagEntry : undefined;

    const shownColumns = columns.filter(c => {
        if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (tag && !tag.predicate(c)) return false;
        return true;
    });
    const filtered = query !== '' || tag !== undefined;

    return (
        <>
        <div className="rounded-md border bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
                <Search size={14} className="shrink-0 text-muted-foreground"/>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search columns…"
                    className="h-6 w-full bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                    {filtered ? `${shownColumns.length} of ${columns.length}` : `${columns.length} total`}
                </span>
            </div>

            {filterTags && filterTags.length > 0 && (
                <FilterTags
                    tags={filterTags}
                    items={columns}
                    activeKey={activeTag}
                    onChange={setActiveTag}
                    className="border-b px-2.5 py-2"
                />
            )}

            {shownColumns.length === 0 && (
                <div className="px-2.5 py-4 text-center text-sm text-muted-foreground">
                    No columns match this filter.
                </div>
            )}

            <div className="max-h-80 overflow-y-auto">
            {shownColumns.map(column => {
                const expandedContent = renderExpanded?.(column);
                const expandable = expandedContent !== undefined && expandedContent !== null;
                const open = expandable && openColumn === column.name;
                const mounted = expandable && (open || mountedColumn === column.name);
                return (
                    <div key={column.name} className="border-b last:border-b-0">
                        <div
                            className={cn(
                                "group flex items-center gap-2 px-2.5 py-1.5",
                                expandable && "cursor-pointer hover:bg-muted/50",
                                open && "bg-muted/50",
                                isDimmed?.(column) && "opacity-50",
                            )}
                            onClick={() => {
                                if (expandable) toggleOpen(column.name, open);
                            }}
                        >
                            {renderLeading?.(column)}
                            {renderIcon(column)}
                            <span className={cn("min-w-0 flex-1 truncate text-sm", open && "font-medium")}>
                                {column.name}
                            </span>
                            {renderStatus?.(column)}
                            {expandable && (
                                <ChevronDown
                                    size={16}
                                    className={cn(
                                        "shrink-0 text-muted-foreground transition-transform",
                                        !open && "-rotate-90",
                                    )}
                                />
                            )}
                        </div>
                        {mounted && (
                            <div
                                className={cn(
                                    "grid transition-[grid-template-rows] duration-200 ease-in-out",
                                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                                )}
                                onTransitionEnd={() => {
                                    if (!open && mountedColumn === column.name) setMountedColumn('');
                                }}
                            >
                                <div className="min-h-0 overflow-hidden">
                                    <div className="px-2.5 pb-3">
                                        {expandedContent}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            </div>
        </div>
        {renderFooter?.(shownColumns)}
        </>
    );
}
