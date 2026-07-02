"use client"

import React from "react"
import {H5, Muted, Small} from "@/components/ui/typography"
import {Separator} from "@/components/ui/separator"
import {Label} from "@/components/ui/label"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Switch} from "@/components/ui/switch"
import {Button} from "@/components/ui/button"
import {RelationViewContentProps} from "@/components/relation/relation-view-content"
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector"
import {ColumnSorting} from "@/model/relation-state/relation-view-table"
import {ViewManager} from "@/model/relation-state/relation-view"
import {getInitialAxisDecoration} from "@/model/relation-view-state/chart"
import {ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, CirclePlus, GripVertical} from "lucide-react"
import {DndContext, closestCenter, DragEndEvent} from "@dnd-kit/core"
import {SortableContext, arrayMove, useSortable, verticalListSortingStrategy} from "@dnd-kit/sortable"
import {restrictToVerticalAxis} from "@dnd-kit/modifiers"
import {Column} from "@/model/data-source-connection"

// --- Sortable sort item ---

interface SortableSortItemProps {
    colName: string
    direction: ColumnSorting
    availableColumns: Column[]
    showHandle: boolean
    onChangeColumn: (oldName: string, newName: string) => void
    onRemove: (colName: string) => void
    onToggleDirection: (colName: string, direction: ColumnSorting) => void
}

function SortableSortItem({colName, direction, availableColumns, showHandle, onChangeColumn, onRemove, onToggleDirection}: SortableSortItemProps) {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: colName})

    const style = {
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
                <ColumnSelector
                    placeholder={'Add sort column...'}
                    plotType="bar"
                    axisType="sort"
                    axis={{columnId: colName, label: colName, decoration: getInitialAxisDecoration(0)}}
                    columns={availableColumns}
                    deleteAxis={() => onRemove(colName)}
                    updateAxis={(update) => {
                        if (update.columnId) onChangeColumn(colName, update.columnId);
                    }}

                prefix={
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0 bg-card"
                            onClick={() => onToggleDirection(colName, direction)}
                        >
                            {direction === 'ASC' ? <ArrowUp size={14} className="text-indigo-600"/> : <ArrowDown size={14} className="text-indigo-600"/>}
                        </Button>
                    }
                />
            </div>
            {showHandle && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-7 shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground"
                    {...listeners}
                    {...attributes}
                >
                    <GripVertical size={14}/>
                </Button>
            )}
        </div>
    )
}

// --- Main config view ---

export function TableConfigView(props: RelationViewContentProps) {
    const {relationState, data} = props;
    const tableState = relationState.viewState.tableState;
    const params = ViewManager.instance.table.getQueryParameters(relationState);
    const columns = data.columns;

    const [addingSort, setAddingSort] = React.useState(false);

    // --- Column visibility ---
    const hiddenSet = new Set(tableState.columnsHidden ?? []);
    const visibleColumnIds = columns.filter(c => !hiddenSet.has(c.name)).map(c => c.id);

    function setShowIndexColumn(show: boolean) {
        props.updateRelationViewState({tableState: {...tableState, showIndexColumn: show}});
    }

    function toggleColumnVisibility(columnId: string) {
        const column = columns.find(c => c.id === columnId);
        if (!column) return;
        const hidden = tableState.columnsHidden ?? [];
        const newHidden = hidden.includes(column.name)
            ? hidden.filter(n => n !== column.name)
            : [...hidden, column.name];
        props.updateRelationViewState({tableState: {...tableState, columnsHidden: newHidden}});
    }

    // --- Sorting ---
    const activeSorts = (Object.entries(params.sorting) as [string, ColumnSorting | undefined][])
        .filter((entry): entry is [string, ColumnSorting] => entry[1] !== undefined);

    const sortedNameSet = new Set(activeSorts.map(([name]) => name));
    const unsortedColumns = columns.filter(c => !sortedNameSet.has(c.name));
    const noSorts = activeSorts.length === 0;

    async function updateSorting(newSorting: Record<string, ColumnSorting | undefined>) {
        await props.updateRelationDataWithParams({
            ...relationState.query.viewParameters,
            table: {...params, sorting: newSorting},
        });
    }

    async function addSort(columnId: string) {
        await updateSorting({...params.sorting, [columnId]: 'ASC'});
    }

    async function changeSortColumn(oldName: string, newName: string) {
        const newSorting: Record<string, ColumnSorting | undefined> = {};
        for (const [key, val] of Object.entries(params.sorting)) {
            newSorting[key === oldName ? newName : key] = val;
        }
        await updateSorting(newSorting);
    }

    async function toggleSortDirection(colName: string, current: ColumnSorting) {
        await updateSorting({...params.sorting, [colName]: current === 'ASC' ? 'DESC' : 'ASC'});
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

    return (
        <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden">
            <div className="pb-1 shrink-0 mr-3">
                <H5>Table Config</H5>
                <Separator/>
            </div>

            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full w-full pr-3">
                    <div className="flex min-h-full flex-col gap-3 p-0.5">



                        {/* Column visibility */}
                        <Label className="h-3"><Muted>Columns</Muted></Label>
                        <ColumnSelector
                            plotType="bar"
                            axisType="columns"
                            multiSelect={true}
                            columns={columns}
                            selectedColumnIds={visibleColumnIds}
                            onColumnToggled={toggleColumnVisibility}
                        />

                        <Separator/>

                        {/* Sorting */}
                        <Label className="h-3"><Muted>Table Sorting</Muted></Label>

                        <DndContext
                            collisionDetection={closestCenter}
                            modifiers={[restrictToVerticalAxis]}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={activeSorts.map(([name]) => name)}
                                strategy={verticalListSortingStrategy}
                            >
                                {activeSorts.map(([colName, direction]) => (
                                    <SortableSortItem
                                        key={colName}
                                        colName={colName}
                                        direction={direction}
                                        availableColumns={columns.filter(c => c.name === colName || !sortedNameSet.has(c.name))}
                                        showHandle={activeSorts.length > 1}
                                        onChangeColumn={changeSortColumn}
                                        onRemove={removeSort}
                                        onToggleDirection={toggleSortDirection}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        {(noSorts || addingSort) && (
                            <ColumnSelector
                                placeholder={'Add sort column...'}
                                plotType="bar"
                                axisType="sort"
                                columns={unsortedColumns}
                                updateAxis={(update) => {
                                    if (update.columnId) addSort(update.columnId);
                                    if (addingSort) setAddingSort(false);
                                }}
                            />
                        )}

                        {!(noSorts || addingSort) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-auto justify-start px-2 bg-card"
                                onClick={() => setAddingSort(true)}
                            >
                                <div className="w-4 h-4 mr-1 flex items-center justify-center">
                                    <CirclePlus className="w-4 h-4 text-muted-foreground"/>
                                </div>
                                <Small>Add Sort Column</Small>
                            </Button>
                        )}

                        <Separator/>
                        {/* Row index toggle */}
                        <div className="flex items-center justify-between">
                            <Label><Muted>Show table row index</Muted></Label>
                            <Switch
                                checked={tableState.showIndexColumn ?? true}
                                onCheckedChange={setShowIndexColumn}
                            />
                        </div>


                        <div className="h-8"/>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
