import {TableContent} from "@/components/relation/table/table-content";
import {TableFooter} from "@/components/relation/table/table-footer";
import {closestCenter, DndContext, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import type {DragEndEvent} from "@dnd-kit/core/dist/types";
import {arrayMove} from "@dnd-kit/sortable";
import {restrictToHorizontalAxis} from "@dnd-kit/modifiers";
import React from "react";
import {getTableColumnViewIndices, TableViewState} from "@/model/relation-view-state/table";
import {cn} from "@/lib/utils";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area";


export function Table(props: RelationViewContentProps) {
    const data = props.data;
    const columnsOrder = props.relationState.viewState.tableState.columnsOrder;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5 // Minimum distance in pixels before dragging starts
            }
        })
    );


    // if there is no data, return null
    if (!data) {
        return null;
    }

    function setTableState(state: TableViewState) {
        props.updateRelationViewState({
            tableState: state,
        });
    }

    function handleDragEnd(event: DragEndEvent) {
        const {active, over} = event;
        if (!over || active.id === over.id) {
            return;
        }

        // Reorder the visible columns, then write the new order back. Columns
        // not currently visible (hidden) are appended so their order is kept.
        const orderedNames = columnViewIndices.map(i => data.columns[i].name);
        const oldIndex = orderedNames.indexOf(active.id as string);
        const newIndex = orderedNames.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const reordered = arrayMove(orderedNames, oldIndex, newIndex);
        const rest = columnsOrder.filter(c => !reordered.includes(c));

        setTableState({
            ...props.relationState.viewState.tableState,
            columnsOrder: [...reordered, ...rest],
        });
    }

    const columnViewIndices = getTableColumnViewIndices(props.relationState.viewState.tableState, data);

    // will the whole height of the screen when not embedded, todo: maybe make max height configurable
    const wrapperClasses = props.height === 'resizable' ? 'h-fit max-h-96' : 'h-full';
    // min-h-0 lets the scroll area shrink inside the flex column so the viewport scrolls
    const contentClasses = props.height === 'resizable' ? 'min-h-0' : 'flex-1 min-h-0';
    // the radix viewport wraps content in an inline-styled display:table div, which
    // breaks the sticky header / index column and the bg-inherit chain of the table
    const viewportFixClasses =
        '[&>[data-radix-scroll-area-viewport]]:bg-inherit'
        + ' [&>[data-radix-scroll-area-viewport]>div]:!block'
        + ' [&>[data-radix-scroll-area-viewport]>div]:bg-inherit';

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
        >
            <div className={cn("nowheel flex bg-inherit flex-col w-full overflow-hidden", wrapperClasses)}>
                <ScrollArea className={cn("bg-inherit", contentClasses, viewportFixClasses)}>
                    <TableContent {...props} columnViewIndices={columnViewIndices} data={data}/>
                    <ScrollBar orientation="horizontal"/>
                </ScrollArea>
                <TableFooter {...props} dataRowCount={data.rows.length}/>
            </div>
        </DndContext>
    )
}