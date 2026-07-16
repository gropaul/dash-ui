'use client';

import React from "react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {ColumnHeadSortingIcon} from "@/components/basics/column-head-sorting-icon";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {CatalogObject, CatalogSelection, ColumnRow, columnGroup, exactRowsTitle, formatEstimatedRows, objectPath, Scope, SortState} from "@/components/catalog/catalog-model";

const HEADER_CLASS = "sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))] [&_tr]:border-b-0";
// Rows match the FolderView row height.
const ROW_CLASS = "h-11 cursor-pointer";

// Folderview-style type tints (tinted background + saturated foreground), keyed by a coarse
// token: object types (table/view) and value-type groups (see getValueTypeGroup).
const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
    table:   {bg: 'rgba(139, 92, 246, 0.12)', fg: '#8b5cf6'}, // purple
    view:    {bg: 'rgba(14, 165, 233, 0.12)', fg: '#0ea5e9'}, // sky
    numeric: {bg: 'rgba(59, 130, 246, 0.12)', fg: '#3b82f6'}, // blue
    string:  {bg: 'rgba(236, 72, 153, 0.12)', fg: '#ec4899'}, // pink
    date:    {bg: 'rgba(249, 115, 22, 0.12)', fg: '#f97316'}, // orange
    nested:  {bg: 'rgba(100, 116, 139, 0.12)', fg: '#64748b'}, // slate
    other:   {bg: 'rgba(148, 163, 184, 0.14)', fg: '#94a3b8'}, // gray
};

interface CatalogGridProps {
    scope: Scope;
    tableRows: CatalogObject[];
    columnRows: ColumnRow[];
    selection: CatalogSelection | null;
    sort: SortState;
    onSort: (key: string) => void;
    /** Single click — show in the side panel. */
    onSelect: (sel: CatalogSelection) => void;
    /** Double click — open full-screen. */
    onActivate: (sel: CatalogSelection) => void;
    onFilterPath: (path: string[]) => void;
}

/** The results grid — tables or columns, depending on scope. */
export function CatalogGrid(props: CatalogGridProps) {
    return props.scope === 'tables' ? <TablesGrid {...props}/> : <ColumnsGrid {...props}/>;
}

/* --------------------------- shared header + cells --------------------------- */

function SortHeader({label, sortKey, sort, onSort, className}: {
    label: string; sortKey: string; sort: SortState; onSort: (k: string) => void; className?: string;
}) {
    const active = sort.key === sortKey;
    return (
        <TableHead className={className}>
            <button type="button" onClick={() => onSort(sortKey)} className="group inline-flex items-center gap-1 hover:text-foreground">
                {label}
                <ColumnHeadSortingIcon sorting={active ? (sort.dir === 'asc' ? 'ASC' : 'DESC') : undefined} iconSize={13}/>
            </button>
        </TableHead>
    );
}

/** Path / Name / Type headers, shared by both grids (`nameLabel` differs). */
function SharedHeaders({sort, onSort, nameLabel}: { sort: SortState; onSort: (k: string) => void; nameLabel: string }) {
    return (
        <>
            <SortHeader label="Path" sortKey="path" sort={sort} onSort={onSort}/>
            <SortHeader label={nameLabel} sortKey="name" sort={sort} onSort={onSort}/>
            <SortHeader label="Type" sortKey="type" sort={sort} onSort={onSort} className="w-40"/>
        </>
    );
}

/** Location breadcrumb, all segments muted; each segment filters by its prefix. */
function PathCell({segs, onFilterPath}: { segs: string[]; onFilterPath: (p: string[]) => void }) {
    return (
        <TableCell className="text-muted-foreground whitespace-nowrap">
            {segs.map((seg, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="text-muted-foreground/50"> / </span>}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onFilterPath(segs.slice(0, i + 1)); }}
                        className="hover:text-foreground"
                    >
                        {seg}
                    </button>
                </React.Fragment>
            ))}
        </TableCell>
    );
}

/** A colored type pill (tinted background + icon + label), folderview-style. */
function TypeCell({iconType, label, token}: { iconType: string; label: string; token: string }) {
    const c = TYPE_COLORS[token] ?? TYPE_COLORS.other;
    return (
        <TableCell>
            <span
                style={{background: c.bg, color: c.fg}}
                className="inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-xs whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
                {defaultIconFactory(iconType)}
                {label}
            </span>
        </TableCell>
    );
}

/** Path + Name + Type cells shared by both grids. */
function SharedCells({pathSegs, name, typeIconType, typeLabel, typeToken, onFilterPath}: {
    pathSegs: string[]; name: string; typeIconType: string; typeLabel: string; typeToken: string;
    onFilterPath: (p: string[]) => void;
}) {
    return (
        <>
            <PathCell segs={pathSegs} onFilterPath={onFilterPath}/>
            <TableCell className="text-foreground whitespace-nowrap">{name}</TableCell>
            <TypeCell iconType={typeIconType} label={typeLabel} token={typeToken}/>
        </>
    );
}

/** Estimated row count, right-aligned; em-dash for views (no estimate). */
function RowsCell({rows}: { rows?: number }) {
    const cell = (
        <TableCell className="text-muted-foreground tabular-nums">
            {formatEstimatedRows(rows)}
        </TableCell>
    );
    const title = exactRowsTitle(rows);
    return title ? <TooltipWrapper message={title}>{cell}</TooltipWrapper> : cell;
}

function EmptyRow({cols, label}: { cols: number; label: string }) {
    return <TableRow><TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">{label}</TableCell></TableRow>;
}

/* -------------------------------- grids -------------------------------- */

function TablesGrid({tableRows, selection, sort, onSort, onSelect, onActivate, onFilterPath}: CatalogGridProps) {
    return (
        <Table className="text-xs" containerClassName="h-full">
            <TableHeader className={HEADER_CLASS}>
                <TableRow>
                    <SharedHeaders sort={sort} onSort={onSort} nameLabel="Name"/>
                    <SortHeader label="Columns" sortKey="cols" sort={sort} onSort={onSort} className="w-24"/>
                    <SortHeader label="Rows" sortKey="rows" sort={sort} onSort={onSort} className="w-24"/>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableRows.length === 0 && <EmptyRow cols={5} label="No tables match."/>}
                {tableRows.map((o) => {
                    const isView = o.objType === 'view';
                    const sel = selection?.objId === o.id && !selection.colName;
                    return (
                        <TableRow
                            key={o.id}
                            onClick={() => onSelect({objId: o.id})}
                            onDoubleClick={() => onActivate({objId: o.id})}
                            className={`${ROW_CLASS} ${sel ? "bg-accent" : ""}`}
                        >
                            <SharedCells
                                pathSegs={objectPath(o).slice(0, -1)} name={o.name} onFilterPath={onFilterPath}
                                typeIconType={o.objType} typeLabel={isView ? 'view' : 'table'} typeToken={isView ? 'view' : 'table'}
                            />
                            <TableCell className="text-muted-foreground tabular-nums">{o.columns.length}</TableCell>
                            <RowsCell rows={o.estimatedRows}/>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function ColumnsGrid({columnRows, selection, sort, onSort, onSelect, onActivate, onFilterPath}: CatalogGridProps) {
    return (
        <Table className="text-xs" containerClassName="h-full">
            <TableHeader className={HEADER_CLASS}>
                <TableRow>
                    <SharedHeaders sort={sort} onSort={onSort} nameLabel="Column"/>
                    <SortHeader label="Rows" sortKey="rows" sort={sort} onSort={onSort} className="w-24"/>
                </TableRow>
            </TableHeader>
            <TableBody>
                {columnRows.length === 0 && <EmptyRow cols={4} label="No columns match."/>}
                {columnRows.map(({o, col}, idx) => {
                    const sel = selection?.objId === o.id && selection.colName === col.name;
                    const target: CatalogSelection = {objId: o.id, colName: col.name};
                    return (
                        <TableRow
                            key={`${o.id}:${col.name}:${idx}`}
                            onClick={() => onSelect(target)}
                            onDoubleClick={() => onActivate(target)}
                            className={`${ROW_CLASS} ${sel ? "bg-accent" : ""}`}
                        >
                            <SharedCells
                                pathSegs={objectPath(o)} name={col.name} onFilterPath={onFilterPath}
                                typeIconType={col.type} typeLabel={col.type} typeToken={columnGroup(col)}
                            />
                            <RowsCell rows={o.estimatedRows}/>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
