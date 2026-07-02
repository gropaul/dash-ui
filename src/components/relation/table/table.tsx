import {TableContent} from "@/components/relation/table/table-content";
import {TableFooter} from "@/components/relation/table/table-footer";
import {DndContext, DragOverEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import type {DragEndEvent, DragStartEvent} from "@dnd-kit/core/dist/types";
import React, {useState} from "react";
import {getTableColumnViewIndices, TableViewState} from "@/model/relation-view-state/table";
import {ColumnDragOverlay} from "@/components/relation/table/table-column/column-drag-overlay";
import {cn} from "@/lib/utils";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area";


export function Table(props: RelationViewContentProps) {
    const data = props.data;
    const columnsOrder = props.relationState.viewState.tableState.columnsOrder;

    const [dragStartOrder, setDragStartOrder] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | number | null>(null);

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

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id);
        setDragStartOrder(columnsOrder);
    }

    function handleDragEnd(_event: DragEndEvent) {
        setActiveId(null);
    }

    function onDragOver(event: DragOverEvent) {
        const over = event.over;

        if (!over) {
            return;
        }

        const target = over.id as string;
        const active = activeId as string;

        if (active === target) {
            // the order is the start order
            setTableState({
                ...props.relationState.viewState.tableState,
                columnsOrder: dragStartOrder,
            });
        } else {
            const targetIndex = dragStartOrder.indexOf(target);
            const activeIndex = dragStartOrder.indexOf(active);

            const newColumnsOrder = [...dragStartOrder];
            // remove the active column
            newColumnsOrder.splice(activeIndex, 1);

            // insert the active column before the target column
            newColumnsOrder.splice(targetIndex, 0, active);

            setTableState({
                ...props.relationState.viewState.tableState,
                columnsOrder: newColumnsOrder,
            });
        }
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
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={onDragOver}>
            <div className={cn("nowheel flex bg-inherit flex-col w-full overflow-hidden", wrapperClasses)}>
                <ScrollArea className={cn("bg-inherit", contentClasses, viewportFixClasses)}>
                    <TableContent {...props} columnViewIndices={columnViewIndices} data={data}/>
                    <ScrollBar orientation="horizontal"/>
                </ScrollArea>
                <TableFooter {...props} dataRowCount={data.rows.length}/>
            </div>
            <ColumnDragOverlay activeId={activeId}/>
        </DndContext>
    )
}