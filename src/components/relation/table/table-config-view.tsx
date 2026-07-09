"use client"

import React from "react"
import {Muted} from "@/components/ui/typography"
import {Separator} from "@/components/ui/separator"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {Button} from "@/components/ui/button"
import {RelationViewContentProps} from "@/components/relation/relation-view-content"
import {ColumnSorting} from "@/model/relation-state/relation-view-table"
import {ViewManager} from "@/model/relation-state/relation-view"
import {Braces, Calendar, ChevronDown, GripVertical, Hash, Sparkles, Text, X} from "lucide-react"
import {getNextColumnSorting} from "@/components/relation/table/table-head/table-column-head"
import {ColumnHeadSortingIcon} from "@/components/basics/column-head-sorting-icon"
import {DndContext, closestCenter, DragEndEvent} from "@dnd-kit/core"
import {SortableContext, arrayMove, useSortable, verticalListSortingStrategy} from "@dnd-kit/sortable"
import {restrictToVerticalAxis} from "@dnd-kit/modifiers"
import {Column} from "@/model/data-source-connection"
import {ColumnConfigList, ColumnFilterTag} from "@/components/relation/common/column-config-list"
import {ColumnDecorationEditor} from "@/components/relation/common/column-decoration-editor"
import {AdaptiveEyeOff} from "@/components/relation/common/eye-icon"
import {ValueIcon} from "@/components/relation/common/value-icon"
import {cn} from "@/lib/utils"
import {INITIAL_COLUMN_VIEW_STATE} from "@/model/relation-view-state/table"
import {
    ColumnDecoration,
    isDecoratableType,
    isStyledDecoration,
} from "@/model/relation-view-state/decoration"
import {getValueTypeGroup} from "@/model/value-type"
import {ConfigSection} from "@/components/relation/common/config-section";



// --- Sortable sort rule (fed from the column list, no column picker) ---

interface SortableSortItemProps {
    colName: string
    direction: ColumnSorting
    index: number
    showHandle: boolean
    onRemove: (colName: string) => void
    onToggleDirection: (colName: string, direction: ColumnSorting) => void
}

function SortableSortItem({colName, direction, index, showHandle, onRemove, onToggleDirection}: SortableSortItemProps) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: colName})

    const style = {
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{colName}</span>
            <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                onClick={() => onToggleDirection(colName, direction)}
            >
                <ColumnHeadSortingIcon sorting={direction} iconSize={13} className="text-indigo-600"/>
                {direction}
            </Button>
            {showHandle && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-5 shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground"
                    {...listeners}
                    {...attributes}
                >
                    <GripVertical size={14}/>
                </Button>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-5 shrink-0 text-muted-foreground"
                onClick={() => onRemove(colName)}
            >
                <X size={14}/>
            </Button>
        </div>
    )
}

// --- Main config view ---

export function TableConfigView(props: RelationViewContentProps) {
    const {relationState, data} = props;
    const tableState = relationState.viewState.tableState;
    const params = ViewManager.instance.table.getQueryParameters(relationState);
    const columns = data.columns;

    // --- Column visibility ---
    const hiddenSet = new Set(tableState.columnsHidden ?? []);

    function setShowIndexColumn(show: boolean) {
        props.updateRelationViewState({tableState: {...tableState, showIndexColumn: show}});
    }

    function toggleColumnVisibility(columnName: string) {
        const hidden = tableState.columnsHidden ?? [];
        const newHidden = hidden.includes(columnName)
            ? hidden.filter(n => n !== columnName)
            : [...hidden, columnName];
        props.updateRelationViewState({tableState: {...tableState, columnsHidden: newHidden}});
    }

    // hide everything except the given columns (e.g. the current search/filter result)
    function onlyShowColumns(shown: Column[]) {
        const shownNames = new Set(shown.map(c => c.name));
        const newHidden = columns.filter(c => !shownNames.has(c.name)).map(c => c.name);
        props.updateRelationViewState({tableState: {...tableState, columnsHidden: newHidden}});
    }

    function showAllColumns() {
        props.updateRelationViewState({tableState: {...tableState, columnsHidden: []}});
    }

    // --- Column decorations ---

    function updateColumnDecoration(columnName: string, decoration: ColumnDecoration) {
        const current = tableState.columnStates[columnName] ?? {...INITIAL_COLUMN_VIEW_STATE};
        props.updateRelationViewState({
            tableState: {
                ...tableState,
                columnStates: {
                    ...tableState.columnStates,
                    [columnName]: {...current, decoration},
                },
            },
        });
    }

    // --- Sorting ---
    const activeSorts = (Object.entries(params.sorting) as [string, ColumnSorting | undefined][])
        .filter((entry): entry is [string, ColumnSorting] => entry[1] !== undefined);

    const sortPosition = (colName: string) => activeSorts.findIndex(([name]) => name === colName);

    async function updateSorting(newSorting: Record<string, ColumnSorting | undefined>) {
        await props.updateRelationDataWithParams({
            ...relationState.query.viewParameters,
            table: {...params, sorting: newSorting},
        });
    }

    async function toggleSortDirection(colName: string, current: ColumnSorting) {
        await updateSorting({...params.sorting, [colName]: current === 'ASC' ? 'DESC' : 'ASC'});
    }

    async function cycleSort(colName: string) {
        const next = getNextColumnSorting(params.sorting[colName]);
        const newSorting = {...params.sorting};
        if (next === undefined) {
            delete newSorting[colName];
        } else {
            newSorting[colName] = next;
        }
        await updateSorting(newSorting);
    }

    async function removeSort(colName: string) {
        const newSorting = {...params.sorting};
        delete newSorting[colName];
        await updateSorting(newSorting);
    }

    function handleDragEnd(event: DragEndEvent) {
        const {active, over} = event;
        if (!over || active.id === over.id) return;
        const oldIndex = activeSorts.findIndex(([name]) => name === String(active.id));
        const newIndex = activeSorts.findIndex(([name]) => name === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(activeSorts, oldIndex, newIndex);
        const newSorting: Record<string, ColumnSorting | undefined> = {};
        for (const [key, val] of reordered) newSorting[key] = val;
        void updateSorting(newSorting);
    }

    // --- Column list rendering ---

    const filterTags: ColumnFilterTag[] = [
        {key: 'numeric', label: 'Numeric', icon: <Hash size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'numeric'},
        {key: 'date', label: 'Date', icon: <Calendar size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'date'},
        {key: 'string', label: 'String', icon: <Text size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'string'},
        {key: 'nested', label: 'Nested', icon: <Braces size={12}/>, predicate: c => getValueTypeGroup(c.type) === 'nested'},
        {key: 'sorted', label: 'Sorted', icon: <ColumnHeadSortingIcon iconSize={12}/>, predicate: c => sortPosition(c.name) > -1},
        {key: 'hidden', label: 'Hidden', icon: <AdaptiveEyeOff visible={true} className="h-3 w-3"/>, predicate: c => hiddenSet.has(c.name)},
        {key: 'styled', label: 'Styled', icon: <Sparkles size={12}/>, predicate: c => isStyledDecoration(tableState.columnStates[c.name]?.decoration)},
    ];

    function renderExpanded(column: Column) {
        if (!isDecoratableType(column.type)) return null;
        return (
            <div className="pt-1">
                <ColumnDecorationEditor
                    columnType={column.type}
                    decoration={tableState.columnStates[column.name]?.decoration}
                    onChange={(deco) => updateColumnDecoration(column.name, deco)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">

                        {/* Row index toggle */}
                        <ConfigSection title={"Table Config"}>
                            <div className="flex items-center justify-between">
                                <Label><Muted>Show table row index</Muted></Label>
                                <Switch
                                    checked={tableState.showIndexColumn ?? true}
                                    onCheckedChange={setShowIndexColumn}
                                />
                            </div>
                        </ConfigSection>

                        <Separator/>

                        {/* Sort order — fed from the column list below */}
                        <ConfigSection
                            title="Sort Order"
                            collapsedSummary={activeSorts.length
                                ? `${activeSorts.length} ${activeSorts.length === 1 ? 'rule' : 'rules'}`
                                : 'none'}
                        >
                            {activeSorts.length === 0 ? (
                                <Muted className="text-sm">
                                    Not sorted. Hover a column below and click the sort arrow.
                                </Muted>
                            ) : (
                                <>
                                    <DndContext
                                        collisionDetection={closestCenter}
                                        modifiers={[restrictToVerticalAxis]}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={activeSorts.map(([name]) => name)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="flex flex-col gap-1.5">
                                                {activeSorts.map(([colName, direction], index) => (
                                                    <SortableSortItem
                                                        key={colName}
                                                        colName={colName}
                                                        direction={direction}
                                                        index={index}
                                                        showHandle={activeSorts.length > 1}
                                                        onRemove={removeSort}
                                                        onToggleDirection={toggleSortDirection}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </>
                            )}
                        </ConfigSection>

                        <Separator/>

                        {/* Columns — the single source of truth */}
                        <ConfigSection title="Columns" collapsedSummary={`${columns.length}`}>
                            <ColumnConfigList
                                columns={columns}
                                filterTags={filterTags}
                                isDimmed={(c) => hiddenSet.has(c.name)}
                                renderLeading={(c) => (
                                    <button
                                        className={cn(
                                            "shrink-0",
                                            hiddenSet.has(c.name) ? "text-muted-foreground/70" : "text-muted-foreground",
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleColumnVisibility(c.name);
                                        }}
                                    >
                                        <AdaptiveEyeOff visible={!hiddenSet.has(c.name)} className="h-3.5 w-3.5"/>
                                    </button>
                                )}
                                renderIcon={(c) => (
                                    <span className={cn(
                                        "shrink-0",
                                        isStyledDecoration(tableState.columnStates[c.name]?.decoration)
                                            ? "text-primary"
                                            : "text-muted-foreground",
                                    )}>
                                        <ValueIcon type={c.type} size={14}/>
                                    </span>
                                )}
                                renderStatus={(c) => {
                                    const pos = sortPosition(c.name);
                                    const sorted = pos > -1;
                                    const direction = sorted ? activeSorts[pos][1] : undefined;
                                    return (
                                        <button
                                            title={sorted ? `Sorted ${direction} — click to change` : 'Sort column'}
                                            className={cn(
                                                "shrink-0 items-center gap-0.5 text-xs",
                                                sorted
                                                    ? "inline-flex text-indigo-600"
                                                    : "hidden group-hover:inline-flex text-muted-foreground hover:text-indigo-600",
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void cycleSort(c.name);
                                            }}
                                        >
                                            <ColumnHeadSortingIcon sorting={direction} iconSize={13}/>
                                            {sorted && activeSorts.length > 1 && (pos + 1)}
                                        </button>
                                    );
                                }}
                                renderExpanded={renderExpanded}
                                renderFooter={(shown) => (
                                    <div className="flex justify-end gap-3 pt-1">
                                        <button
                                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                            onClick={() => onlyShowColumns(shown)}
                                        >
                                            Only show selected
                                        </button>
                                        <button
                                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                            onClick={showAllColumns}
                                        >
                                            Show all columns
                                        </button>
                                    </div>
                                )}
                            />
                        </ConfigSection>

                        <div className="h-8"/>
        </div>
    );
}
